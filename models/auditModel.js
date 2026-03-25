import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const AuditLog = sequelize.define("AuditLog", {
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false }, // 'create', 'update', 'delete', 'approve', etc.
  resource_type: { type: DataTypes.STRING, allowNull: false }, // 'User', 'Procurement', 'BidSubmission', etc.
  resource_id: { type: DataTypes.INTEGER, allowNull: false },

  // Request details
  ip_address: { type: DataTypes.STRING, allowNull: true },
  user_agent: { type: DataTypes.TEXT, allowNull: true },

  // Changes
  changes_before: { type: DataTypes.JSON, allowNull: true },
  changes_after: { type: DataTypes.JSON, allowNull: true },

  // Status
  status: {
    type: DataTypes.ENUM('success', 'failure'),
    defaultValue: 'success'
  },
  error_message: { type: DataTypes.TEXT, allowNull: true },

  // Blockchain
  blockchain_tx: { type: DataTypes.STRING, allowNull: true },

  // Timestamp
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  indexes: [
    { fields: ['user_id', 'created_at'] },
    { fields: ['resource_type', 'resource_id'] },
    { fields: ['action'] },
    { fields: ['created_at'] }
  ]
});

export const DocumentMetadata = sequelize.define("DocumentMetadata", {
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  procurement_id: { type: DataTypes.INTEGER, allowNull: true },
  bid_submission_id: { type: DataTypes.INTEGER, allowNull: true },

  // Filename
  original_filename: { type: DataTypes.STRING, allowNull: false },
  sanitized_filename: { type: DataTypes.STRING, allowNull: false },
  file_type: { type: DataTypes.STRING, allowNull: false }, // 'application', 'bid', 'noa', 'contract'
  mime_type: { type: DataTypes.STRING, allowNull: true },

  // File details
  file_size: { type: DataTypes.INTEGER, allowNull: true }, // in bytes
  file_path: { type: DataTypes.STRING, allowNull: false },
  sha256_hash: { type: DataTypes.STRING(64), allowNull: false },

  // Security
  encryption_key: { type: DataTypes.STRING, allowNull: true },
  virus_scan_status: {
    type: DataTypes.ENUM('pending', 'clean', 'infected'),
    defaultValue: 'pending'
  },

  // Versioning
  version: { type: DataTypes.INTEGER, defaultValue: 1 },
  is_latest: { type: DataTypes.BOOLEAN, defaultValue: true },
  replaced_by_id: { type: DataTypes.INTEGER, allowNull: true },

  // Access tracking
  access_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_accessed_at: { type: DataTypes.DATE, allowNull: true },

  // Blockchain
  blockchain_tx: { type: DataTypes.STRING, allowNull: true },

  // Metadata
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  indexes: [
    { fields: ['user_id'] },
    { fields: ['procurement_id'] },
    { fields: ['bid_submission_id'] },
    { fields: ['sha256_hash'] },
    { fields: ['created_at'] }
  ]
});
