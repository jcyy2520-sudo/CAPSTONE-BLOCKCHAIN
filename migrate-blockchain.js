/**
 * Blockchain Initialization Migration
 * Creates initial blockchain state and genesis block
 */

import { sequelize } from "./models/db.js";
import { BlockchainBlock, BlockchainState, BlockchainTransaction } from "./models/blockchainModel.js";
import blockchainService from "./services/blockchainService.js";
import crypto from "crypto";

async function initializeBlockchain() {
  try {
    console.log("Initializing blockchain...");

    // Check if blockchain already initialized
    const existingState = await BlockchainState.findOne();
    if (existingState) {
      console.log("Blockchain already initialized");
      return;
    }

    // Create genesis block
    const genesisBlockData = {
      previous_hash: "0000000000000000000000000000000000000000000000000000000000000000",
      merkle_root: blockchainService.calculateMerkleRoot([]),
      timestamp: Date.now(),
      nonce: 0
    };

    const genesisBlockHash = blockchainService.hashData({
      block_number: 0,
      ...genesisBlockData
    });

    const genesisBlock = await BlockchainBlock.create({
      block_number: 0,
      block_hash: genesisBlockHash,
      previous_hash: genesisBlockData.previous_hash,
      merkle_root: genesisBlockData.merkle_root,
      nonce: 0,
      difficulty: 2,
      transaction_count: 0,
      timestamp: genesisBlockData.timestamp,
      created_by: "SYSTEM",
      is_valid: true
    });

    console.log("Genesis block created:", genesisBlock.block_number);

    // Create blockchain state
    const blockchainState = await BlockchainState.create({
      chain_length: 1,
      total_transactions: 0,
      last_block_hash: genesisBlockHash,
      last_block_timestamp: genesisBlockData.timestamp,
      is_valid: true,
      verification_status: "valid",
      last_verified_at: new Date(),
      total_difficulty: 2
    });

    console.log("Blockchain state initialized");

    // Create genesis transaction
    const genesisTransaction = await BlockchainTransaction.create({
      tx_hash: blockchainService.hashData("genesis"),
      block_number: 0,
      tx_type: "admin_action",
      resource_type: "BlockchainState",
      resource_id: blockchainState.id,
      data_hash: blockchainService.hashData("genesis_initialization"),
      full_data: JSON.stringify({
        action: "blockchain_initialized",
        timestamp: new Date().toISOString(),
        description: "Blockchain genesis block created"
      }),
      status: "confirmed",
      timestamp: Date.now()
    });

    console.log("Blockchain initialized successfully!");
    console.log("Genesis block hash:", genesisBlockHash);
    console.log("Blockchain is ready for transactions");

  } catch (error) {
    console.error("Error initializing blockchain:", error);
    throw error;
  }
}

// Run initialization
try {
  await initializeBlockchain();
  console.log("Blockchain migration completed successfully");
  process.exit(0);
} catch (error) {
  console.error("Blockchain migration failed:", error);
  process.exit(1);
}
