import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const NoticeOfAward = sequelize.define("NoticeOfAward", {
  procurement_id: { type: DataTypes.INTEGER, allowNull: false },
  winning_bid_id: { type: DataTypes.INTEGER, allowNull: false },
  winning_bidder_id: { type: DataTypes.INTEGER, allowNull: false },

  // Award details
  awarded_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  award_date: { type: DataTypes.DATE, allowNull: false },
  status: {
    type: DataTypes.ENUM('draft', 'issued', 'accepted', 'contested', 'finalized'),
    defaultValue: 'draft'
  },

  // NOA document
  noa_document_path: { type: DataTypes.STRING, allowNull: true },
  noa_file_hash: { type: DataTypes.STRING(64), allowNull: true },

  // Signatures
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  approver_signature: { type: DataTypes.TEXT, allowNull: true },

  bidder_acknowledgment_date: { type: DataTypes.DATE, allowNull: true },

  // Blockchain
  digital_procurement_id: { type: DataTypes.STRING, allowNull: true },
  blockchain_tx: { type: DataTypes.STRING, allowNull: true },

  // Additional info
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  indexes: [
    { fields: ['procurement_id'] },
    { fields: ['winning_bidder_id'] },
    { fields: ['status'] }
  ]
});

export const Contract = sequelize.define("Contract", {
  noa_id: { type: DataTypes.INTEGER, allowNull: false },
  procurement_id: { type: DataTypes.INTEGER, allowNull: false },
  bidder_id: { type: DataTypes.INTEGER, allowNull: false },

  // Contract details
  contract_number: { type: DataTypes.STRING, allowNull: false, unique: true },
  status: {
    type: DataTypes.ENUM('draft', 'signed', 'active', 'completed', 'terminated'),
    defaultValue: 'draft'
  },

  // Contract document
  contract_document_path: { type: DataTypes.STRING, allowNull: true },
  contract_file_hash: { type: DataTypes.STRING(64), allowNull: true },

  // Contract dates
  contract_start_date: { type: DataTypes.DATE, allowNull: true },
  contract_end_date: { type: DataTypes.DATE, allowNull: true },
  contract_duration_days: { type: DataTypes.INTEGER, allowNull: true },

  // Financial terms
  contract_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING, defaultValue: 'PHP' },
  payment_terms: { type: DataTypes.TEXT, allowNull: true },

  // Signatures
  government_signatory_id: { type: DataTypes.INTEGER, allowNull: true },
  government_signatory_date: { type: DataTypes.DATE, allowNull: true },
  government_signature: { type: DataTypes.TEXT, allowNull: true },

  contractor_signatory_id: { type: DataTypes.INTEGER, allowNull: true },
  contractor_signatory_date: { type: DataTypes.DATE, allowNull: true },
  contractor_signature: { type: DataTypes.TEXT, allowNull: true },

  // Blockchain
  blockchain_tx: { type: DataTypes.STRING, allowNull: true },
  blockchain_verified: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Notes
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  indexes: [
    { fields: ['procurement_id'] },
    { fields: ['bidder_id'] },
    { fields: ['status'] }
  ]
});
