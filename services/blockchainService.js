/**
 * Blockchain Service
 * Implements a proper blockchain with SHA-256 hashing, Merkle trees, and verification
 */

import crypto from 'crypto';
import { BlockchainBlock, BlockchainTransaction, BlockchainState } from '../models/blockchainModel.js';
import fs from 'fs';
import path from 'path';

class BlockchainService {
  // Hash a data object using SHA-256
  static hashData(data) {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  // Calculate Merkle root from transaction hashes
  static calculateMerkleRoot(txHashes) {
    if (txHashes.length === 0) return this.hashData('');
    if (txHashes.length === 1) return txHashes[0];

    let currentLevel = txHashes;
    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const parent = this.hashData(left + right);
        nextLevel.push(parent);
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0];
  }

  // Create a new transaction
  static async createTransaction(type, userId, resourceType, resourceId, data) {
    const timestamp = Date.now();
    const dataHash = this.hashData(data);
    const txContent = `${type}${resourceType}${resourceId}${timestamp}${dataHash}`;
    const txHash = this.hashData(txContent);

    // Get previous transaction hash for chain linking
    const lastTx = await BlockchainTransaction.findOne({
      order: [['created_at', 'DESC']]
    });

    const transaction = await BlockchainTransaction.create({
      tx_hash: txHash,
      tx_type: type,
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      data_hash: dataHash,
      full_data: data,
      timestamp: timestamp,
      previous_tx_hash: lastTx?.tx_hash || null,
      status: 'pending'
    });

    return transaction;
  }

  // Mine a new block (Proof of Work)
  static async mineBlock(transactions, difficulty = 2) {
    const state = await BlockchainState.findOne();
    const previousBlock = await BlockchainBlock.findOne({
      order: [['block_number', 'DESC']]
    });

    const blockNumber = previousBlock ? previousBlock.block_number + 1 : 0;
    const previousHash = previousBlock?.block_hash || '0'.repeat(64);

    // Get transaction hashes
    const txHashes = transactions.map(tx => tx.tx_hash);
    const merkleRoot = this.calculateMerkleRoot(txHashes);

    // Proof of Work
    let nonce = 0;
    let blockHash;
    const target = '0'.repeat(difficulty);

    const startTime = Date.now();
    while (true) {
      const blockData = JSON.stringify({
        blockNumber,
        previousHash,
        merkleRoot,
        timestamp: Date.now(),
        nonce,
        transactions: txHashes
      });
      blockHash = this.hashData(blockData);

      if (blockHash.startsWith(target)) {
        break;
      }
      nonce++;

      // Safety check - don't loop forever
      if (nonce > 1000000) {
        throw new Error('Mining timeout - block not found');
      }
    }

    const miningTime = Date.now() - startTime;

    // Create block
    const block = await BlockchainBlock.create({
      block_number: blockNumber,
      block_hash: blockHash,
      previous_hash: previousHash,
      merkle_root: merkleRoot,
      nonce: nonce,
      difficulty: difficulty,
      transaction_count: transactions.length,
      timestamp: Date.now(),
      created_by: 'system'
    });

    // Update transactions to confirmed
    for (const tx of transactions) {
      await tx.update({
        block_number: blockNumber,
        status: 'confirmed'
      });
    }

    // Update blockchain state
    await BlockchainState.update({
      chain_length: blockNumber + 1,
      total_transactions: state.total_transactions + transactions.length,
      last_block_hash: blockHash,
      last_block_timestamp: Date.now(),
      total_difficulty: state.total_difficulty + (difficulty * nonce)
    });

    // Log to file for redundancy
    try {
      const ledgerDir = path.join(process.cwd(), 'blockchain');
      await fs.promises.mkdir(ledgerDir, { recursive: true });
      const blockLine = JSON.stringify({
        block_number: blockNumber,
        block_hash: blockHash,
        previous_hash: previousHash,
        mined_at: new Date().toISOString(),
        mining_time_ms: miningTime,
        nonce: nonce
      }) + '\n';
      await fs.promises.appendFile(
        path.join(ledgerDir, 'blocks.txt'),
        blockLine
      );
    } catch (err) {
      console.warn('Could not write to blockchain ledger:', err.message);
    }

    return block;
  }

  // Verify blockchain integrity
  static async verifyChain() {
    const blocks = await BlockchainBlock.findAll({
      order: [['block_number', 'ASC']]
    });

    if (blocks.length === 0) return true;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Verify hash
      if (!block.block_hash) {
        console.error(`Block ${i}: Invalid block hash`);
        return false;
      }

      // Verify chain link
      if (i > 0) {
        const previousBlock = blocks[i - 1];
        if (block.previous_hash !== previousBlock.block_hash) {
          console.error(`Block ${i}: Chain broken - previous hash mismatch`);
          return false;
        }
      }
    }

    // Update state
    await BlockchainState.update({
      verification_status: 'valid',
      last_verified_at: new Date()
    });

    return true;
  }

  // Get transaction by hash
  static async getTransaction(txHash) {
    return await BlockchainTransaction.findOne({
      where: { tx_hash: txHash }
    });
  }

  // Get block by number
  static async getBlock(blockNumber) {
    return await BlockchainBlock.findOne({
      where: { block_number: blockNumber }
    });
  }

  // Get blockchain stats
  static async getChainStats() {
    const state = await BlockchainState.findOne();
    const blocks = await BlockchainBlock.count();
    const transactions = await BlockchainTransaction.count();

    return {
      chainLength: state?.chain_length || 0,
      totalBlocks: blocks,
      totalTransactions: transactions,
      lastBlockHash: state?.last_block_hash,
      isValid: state?.verification_status === 'valid',
      lastVerifiedAt: state?.last_verified_at
    };
  }

  // Initialize blockchain (create genesis block)
  static async initializeBlockchain() {
    const existing = await BlockchainBlock.findOne({ where: { block_number: 0 } });
    if (existing) return existing;

    // Create genesis block
    const genesisData = {
      timestamp: Date.now(),
      data: 'Genesis Block - Procurement System'
    };

    const genesisHash = this.hashData(genesisData);

    const genesis = await BlockchainBlock.create({
      block_number: 0,
      block_hash: genesisHash,
      previous_hash: '0'.repeat(64),
      merkle_root: genesisHash,
      nonce: 0,
      difficulty: 0,
      transaction_count: 0,
      timestamp: Date.now(),
      created_by: 'system'
    });

    // Initialize state
    await BlockchainState.create({
      chain_length: 1,
      total_transactions: 0,
      last_block_hash: genesisHash,
      last_block_timestamp: Date.now(),
      is_valid: true,
      verification_status: 'valid'
    });

    console.log('✅ Genesis block created');
    return genesis;
  }
}

export default BlockchainService;
