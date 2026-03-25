import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

/**
 * Represents a block in the blockchain
 * Proper blockchain with hash chains for immutability
 */
export const BlockchainBlock = sequelize.define("BlockchainBlock", {
  block_number: { type: DataTypes.INTEGER, allowNull: false, unique: true },

  // Block hash
  block_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true }, // SHA-256
  previous_hash: { type: DataTypes.STRING(64), allowNull: false }, // Links to previous block

  // Merkle tree
  merkle_root: { type: DataTypes.STRING(64), allowNull: false }, // Root of transaction hashes

  // Proof of work
  nonce: { type: DataTypes.BIGINT, allowNull: false }, // Used for mining difficulty
  difficulty: { type: DataTypes.INTEGER, defaultValue: 2 },

  // Transactions in this block
  transaction_count: { type: DataTypes.INTEGER, defaultValue: 0 },

  // Timestamp
  timestamp: { type: DataTypes.BIGINT, allowNull: false },

  // Miner/Creator
  created_by: { type: DataTypes.STRING, allowNull: true }, // System identifier

  // State
  is_valid: { type: DataTypes.BOOLEAN, defaultValue: true },
  validation_errors: { type: DataTypes.JSON, allowNull: true }
}, {
  indexes: [
    { fields: ['block_number'] },
    { fields: ['block_hash'] },
    { fields: ['previous_hash'] },
    { fields: ['timestamp'] }
  ],
  timestamps: true
});

/**
 * Represents a transaction in the blockchain
 * Records all system events (applications, approvals, bids, evaluations, awards)
 */
export const BlockchainTransaction = sequelize.define("BlockchainTransaction", {
  tx_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  block_number: { type: DataTypes.INTEGER, allowNull: true }, // Null if not yet mined

  // Transaction type
  tx_type: {
    type: DataTypes.ENUM(
      'application_submitted',
      'application_verified',
      'application_rejected',
      'bid_submitted',
      'bid_opened',
      'bid_evaluated',
      'award_issued',
      'contract_signed',
      'procurement_created',
      'procurement_updated',
      'admin_action'
    ),
    allowNull: false
  },

  // References
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  resource_type: { type: DataTypes.STRING, allowNull: false }, // 'User', 'Procurement', 'BidSubmission', etc.
  resource_id: { type: DataTypes.INTEGER, allowNull: false },

  // Transaction data
  data_hash: { type: DataTypes.STRING(64), allowNull: false }, // SHA-256 of transaction data
  full_data: { type: DataTypes.JSON, allowNull: false }, // Actual transaction data

  // Digital signature
  signature: { type: DataTypes.TEXT, allowNull: true }, // RSA/ECDSA signature
  signer_public_key: { type: DataTypes.TEXT, allowNull: true },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'invalid'),
    defaultValue: 'pending'
  },

  // Timestamp
  timestamp: { type: DataTypes.BIGINT, allowNull: false },

  // Previous transaction for ordering
  previous_tx_hash: { type: DataTypes.STRING(64), allowNull: true }
}, {
  indexes: [
    { fields: ['tx_hash'] },
    { fields: ['block_number'] },
    { fields: ['resource_type', 'resource_id'] },
    { fields: ['user_id'] },
    { fields: ['timestamp'] },
    { fields: ['status'] }
  ],
  timestamps: false
});

/**
 * Blockchain state and statistics
 */
export const BlockchainState = sequelize.define("BlockchainState", {
  chain_length: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_transactions: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_block_hash: { type: DataTypes.STRING(64), allowNull: true },
  last_block_timestamp: { type: DataTypes.BIGINT, allowNull: true },
  is_valid: { type: DataTypes.BOOLEAN, defaultValue: true },
  total_difficulty: { type: DataTypes.BIGINT, defaultValue: 0 },

  // Verification
  last_verified_at: { type: DataTypes.DATE, allowNull: true },
  verification_status: {
    type: DataTypes.ENUM('unverified', 'valid', 'invalid'),
    defaultValue: 'unverified'
  }
}, {
  timestamps: true,
  // Single row table
  instanceName: 'BlockchainState'
});
