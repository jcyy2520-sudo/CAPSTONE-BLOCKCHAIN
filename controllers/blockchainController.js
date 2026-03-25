/**
 * Blockchain Controller
 * Handles blockchain verification, statistics, and explorer
 */

import { BlockchainBlock, BlockchainTransaction, BlockchainState } from "../models/blockchainModel.js";
import blockchainService from "../services/blockchainService.js";
import { AuditLog } from "../models/auditModel.js";

/**
 * GET /admin/blockchain/stats
 * Get blockchain statistics and status
 */
export const getBlockchainStats = async (req, res) => {
  try {
    const blockchainState = await BlockchainState.findOne();

    if (!blockchainState) {
      return res.json({
        chain_length: 0,
        total_transactions: 0,
        is_valid: true,
        verification_status: 'unverified',
        last_verified_at: null
      });
    }

    const blockCount = await BlockchainBlock.count();
    const txCount = await BlockchainTransaction.count();

    res.json({
      chain_length: blockCount,
      total_transactions: txCount,
      last_block_hash: blockchainState.last_block_hash,
      last_block_timestamp: blockchainState.last_block_timestamp,
      is_valid: blockchainState.is_valid,
      verification_status: blockchainState.verification_status,
      last_verified_at: blockchainState.last_verified_at,
      total_difficulty: blockchainState.total_difficulty
    });
  } catch (err) {
    console.error("Error getting blockchain stats:", err);
    res.status(500).json({ error: 'Error loading blockchain statistics' });
  }
};

/**
 * GET /admin/blockchain/dashboard
 * Show blockchain dashboard with stats and charts
 */
export const showBlockchainDashboard = async (req, res) => {
  try {
    const blockchainState = await BlockchainState.findOne();

    const blockCount = await BlockchainBlock.count();
    const txCount = await BlockchainTransaction.count();
    const validTxCount = await BlockchainTransaction.count({
      where: { status: 'confirmed' }
    });

    // Get transaction distribution by type
    const txByType = await BlockchainTransaction.findAll({
      attributes: ['tx_type'],
      raw: true,
      group: ['tx_type'],
      subQuery: false
    });

    // Get recent transactions
    const recentTx = await BlockchainTransaction.findAll({
      order: [['timestamp', 'DESC']],
      limit: 10
    });

    // Get recent blocks
    const recentBlocks = await BlockchainBlock.findAll({
      order: [['block_number', 'DESC']],
      limit: 5
    });

    res.render("admin/blockchain-dashboard", {
      title: "Blockchain Dashboard",
      stats: {
        block_count: blockCount,
        transaction_count: txCount,
        valid_transactions: validTxCount,
        verification_status: blockchainState?.verification_status || 'unverified',
        is_valid: blockchainState?.is_valid || false,
        last_verified: blockchainState?.last_verified_at
      },
      recent_transactions: recentTx.map(t => t.toJSON()),
      recent_blocks: recentBlocks.map(b => b.toJSON()),
      tx_types: txByType
    });
  } catch (err) {
    console.error("Error showing blockchain dashboard:", err);
    req.flash('error_msg', 'Error loading blockchain dashboard');
    res.redirect('/admin/dashboard');
  }
};

/**
 * POST /admin/blockchain/verify
 * Verify blockchain integrity
 */
export const verifyBlockchain = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get all blocks
    const blocks = await BlockchainBlock.findAll({
      order: [['block_number', 'ASC']]
    });

    let isValid = true;
    const errors = [];

    // Verify chain integrity
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Verify hash linkage
      if (i > 0 && block.previous_hash !== blocks[i - 1].block_hash) {
        isValid = false;
        errors.push(`Block ${block.block_number}: Previous hash mismatch`);
      }

      // Verify merkle root
      const blockTxs = await BlockchainTransaction.findAll({
        where: { block_number: block.block_number }
      });

      if (blockTxs.length > 0) {
        const txHashes = blockTxs.map(tx => tx.data_hash);
        const calculatedMerkle = blockchainService.calculateMerkleRoot(txHashes);

        if (calculatedMerkle !== block.merkle_root) {
          isValid = false;
          errors.push(`Block ${block.block_number}: Merkle root mismatch`);
        }
      }

      // Verify block hash
      const blockData = {
        block_number: block.block_number,
        previous_hash: block.previous_hash,
        merkle_root: block.merkle_root,
        timestamp: block.timestamp,
        nonce: block.nonce
      };

      const calculatedHash = blockchainService.hashData(blockData);
      if (calculatedHash !== block.block_hash) {
        isValid = false;
        errors.push(`Block ${block.block_number}: Block hash mismatch`);
      }
    }

    // Update blockchain state
    const blockchainState = await BlockchainState.findOne();
    if (blockchainState) {
      await blockchainState.update({
        is_valid: isValid,
        verification_status: isValid ? 'valid' : 'invalid',
        last_verified_at: new Date(),
        validation_errors: errors.length > 0 ? errors : null
      });
    }

    // Log verification
    await AuditLog.create({
      user_id: userId,
      action: 'verify_blockchain',
      resource_type: 'BlockchainState',
      resource_id: blockchainState?.id || 0,
      changes_after: {
        is_valid: isValid,
        verification_status: isValid ? 'valid' : 'invalid',
        error_count: errors.length
      },
      status: 'success'
    });

    if (req.accepts('json')) {
      return res.json({
        is_valid: isValid,
        verification_status: isValid ? 'valid' : 'invalid',
        errors: errors,
        blocks_checked: blocks.length,
        message: isValid ? 'Blockchain verified successfully' : 'Blockchain integrity issues found'
      });
    }

    if (isValid) {
      req.flash('success_msg', 'Blockchain verified successfully');
    } else {
      req.flash('error_msg', `Blockchain integrity issues found: ${errors.length} errors`);
    }

    res.redirect('/admin/blockchain/dashboard');
  } catch (err) {
    console.error("Error verifying blockchain:", err);
    req.flash('error_msg', 'Error verifying blockchain');
    res.redirect('/admin/blockchain/dashboard');
  }
};

/**
 * GET /admin/blockchain/blocks
 * List all blockchain blocks
 */
export const listBlocks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const { count, rows: blocks } = await BlockchainBlock.findAndCountAll({
      order: [['block_number', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    res.render("admin/blockchain-blocks", {
      title: "Blockchain Blocks",
      blocks: blocks.map(b => b.toJSON()),
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: count,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });
  } catch (err) {
    console.error("Error listing blocks:", err);
    req.flash('error_msg', 'Error loading blocks');
    res.redirect('/admin/blockchain/dashboard');
  }
};

/**
 * GET /admin/blockchain/block/:blockNumber
 * View specific block details
 */
export const viewBlock = async (req, res) => {
  try {
    const { blockNumber } = req.params;

    const block = await BlockchainBlock.findOne({
      where: { block_number: blockNumber }
    });

    if (!block) {
      req.flash('error_msg', 'Block not found');
      return res.redirect('/admin/blockchain/blocks');
    }

    // Get transactions in this block
    const transactions = await BlockchainTransaction.findAll({
      where: { block_number: blockNumber },
      order: [['timestamp', 'DESC']]
    });

    res.render("admin/blockchain-block-detail", {
      title: `Block #${blockNumber}`,
      block: block.toJSON(),
      transactions: transactions.map(t => ({
        ...t.toJSON(),
        full_data: JSON.parse(t.full_data || '{}')
      }))
    });
  } catch (err) {
    console.error("Error viewing block:", err);
    req.flash('error_msg', 'Error loading block details');
    res.redirect('/admin/blockchain/blocks');
  }
};

/**
 * GET /admin/blockchain/transactions
 * List blockchain transactions
 */
export const listTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const txType = req.query.type || null;
    const limit = 20;
    const offset = (page - 1) * limit;

    const where = txType ? { tx_type: txType } : {};

    const { count, rows: transactions } = await BlockchainTransaction.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    // Get unique transaction types for filter
    const txTypes = await BlockchainTransaction.findAll({
      attributes: ['tx_type'],
      raw: true,
      group: ['tx_type'],
      subQuery: false
    });

    res.render("admin/blockchain-transactions", {
      title: "Blockchain Transactions",
      transactions: transactions.map(t => ({
        ...t.toJSON(),
        full_data: JSON.parse(t.full_data || '{}')
      })),
      tx_types: txTypes.map(t => t.tx_type),
      selected_type: txType,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: count,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });
  } catch (err) {
    console.error("Error listing transactions:", err);
    req.flash('error_msg', 'Error loading transactions');
    res.redirect('/admin/blockchain/dashboard');
  }
};

/**
 * GET /admin/blockchain/transaction/:txHash
 * View transaction details
 */
export const viewTransaction = async (req, res) => {
  try {
    const { txHash } = req.params;

    const transaction = await BlockchainTransaction.findOne({
      where: { tx_hash: txHash }
    });

    if (!transaction) {
      req.flash('error_msg', 'Transaction not found');
      return res.redirect('/admin/blockchain/transactions');
    }

    const block = transaction.block_number
      ? await BlockchainBlock.findOne({ where: { block_number: transaction.block_number } })
      : null;

    res.render("admin/blockchain-transaction-detail", {
      title: "Transaction Details",
      transaction: {
        ...transaction.toJSON(),
        full_data: JSON.parse(transaction.full_data || '{}')
      },
      block: block ? block.toJSON() : null
    });
  } catch (err) {
    console.error("Error viewing transaction:", err);
    req.flash('error_msg', 'Error loading transaction');
    res.redirect('/admin/blockchain/transactions');
  }
};

/**
 * GET /admin/blockchain/explorer
 * Blockchain explorer interface
 */
export const showBlockchainExplorer = async (req, res) => {
  try {
    const search = req.query.search || '';
    let searchResult = null;

    if (search) {
      // Try to find by block hash
      let result = await BlockchainBlock.findOne({
        where: { block_hash: search }
      });

      if (result) {
        searchResult = {
          type: 'block',
          data: result.toJSON()
        };
      } else {
        // Try to find by transaction hash
        result = await BlockchainTransaction.findOne({
          where: { tx_hash: search }
        });

        if (result) {
          searchResult = {
            type: 'transaction',
            data: {
              ...result.toJSON(),
              full_data: JSON.parse(result.full_data || '{}')
            }
          };
        }
      }
    }

    // Get stats for display
    const blockCount = await BlockchainBlock.count();
    const txCount = await BlockchainTransaction.count();
    const validTxCount = await BlockchainTransaction.count({
      where: { status: 'confirmed' }
    });

    res.render("admin/blockchain-explorer", {
      title: "Blockchain Explorer",
      search_query: search,
      search_result: searchResult,
      stats: {
        block_count: blockCount,
        transaction_count: txCount,
        valid_transactions: validTxCount
      }
    });
  } catch (err) {
    console.error("Error in blockchain explorer:", err);
    req.flash('error_msg', 'Error in blockchain explorer');
    res.redirect('/admin/dashboard');
  }
};

/**
 * GET /admin/blockchain/export
 * Export blockchain data
 */
export const exportBlockchainData = async (req, res) => {
  try {
    const format = req.query.format || 'json'; // json or csv

    const blocks = await BlockchainBlock.findAll({
      order: [['block_number', 'ASC']]
    });

    const transactions = await BlockchainTransaction.findAll({
      order: [['timestamp', 'ASC']]
    });

    if (format === 'csv') {
      // Convert to CSV
      let csv = 'Block Number,Block Hash,Merkle Root,Transaction Count,Timestamp\n';
      blocks.forEach(b => {
        csv += `${b.block_number},"${b.block_hash}","${b.merkle_root}",${b.transaction_count},${b.timestamp}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=blockchain.csv');
      return res.send(csv);
    } else {
      // JSON format
      const data = {
        exported_at: new Date().toISOString(),
        total_blocks: blocks.length,
        total_transactions: transactions.length,
        blocks: blocks.map(b => b.toJSON()),
        transactions: transactions.map(t => ({
          ...t.toJSON(),
          full_data: JSON.parse(t.full_data || '{}')
        }))
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=blockchain.json');
      return res.send(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Error exporting blockchain data:", err);
    req.flash('error_msg', 'Error exporting blockchain data');
    res.redirect('/admin/blockchain/dashboard');
  }
};
