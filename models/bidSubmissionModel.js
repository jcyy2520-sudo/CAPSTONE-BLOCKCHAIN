import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const BidSubmission = sequelize.define("BidSubmission", {
  procurement_id: { type: DataTypes.INTEGER, allowNull: false },
  bidder_id: { type: DataTypes.INTEGER, allowNull: false },

  // Document paths
  technical_proposal_path: { type: DataTypes.STRING, allowNull: true },
  financial_proposal_path: { type: DataTypes.STRING, allowNull: true },

  // Bid details
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'opened', 'evaluated', 'rejected', 'won'),
    allowNull: false,
    defaultValue: 'draft'
  },

  submission_date: { type: DataTypes.DATE, allowNull: true },
  bid_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
  bid_currency: { type: DataTypes.STRING, allowNull: true, defaultValue: 'PHP' },

  // Hashing for verification
  technical_hash: { type: DataTypes.STRING(64), allowNull: true }, // SHA-256
  financial_hash: { type: DataTypes.STRING(64), allowNull: true },
  bid_sealing_hash: { type: DataTypes.STRING(64), allowNull: true }, // Sealed bid hash

  // Blockchain
  digital_procurement_id: { type: DataTypes.STRING, allowNull: true },
  blockchain_tx: { type: DataTypes.STRING, allowNull: true },
  blockchain_verified: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Notes
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  indexes: [
    { fields: ['procurement_id', 'bidder_id'] },
    { fields: ['status'] },
    { fields: ['submission_date'] }
  ]
});
