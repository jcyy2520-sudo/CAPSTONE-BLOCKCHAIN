import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const BidEvaluation = sequelize.define("BidEvaluation", {
  procurement_id: { type: DataTypes.INTEGER, allowNull: false },
  bid_submission_id: { type: DataTypes.INTEGER, allowNull: false },
  bidder_id: { type: DataTypes.INTEGER, allowNull: false },

  // Evaluation scores
  technical_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  technical_remarks: { type: DataTypes.TEXT, allowNull: true },

  financial_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  financial_remarks: { type: DataTypes.TEXT, allowNull: true },

  // Weighted scores
  weighted_technical: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  weighted_financial: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  total_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },

  // Ranking
  rank: { type: DataTypes.INTEGER, allowNull: true },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'evaluated', 'challenged', 'approved'),
    allowNull: false,
    defaultValue: 'pending'
  },

  // Evaluator info
  evaluated_by: { type: DataTypes.INTEGER, allowNull: true },
  evaluated_at: { type: DataTypes.DATE, allowNull: true },
  evaluator_remarks: { type: DataTypes.TEXT, allowNull: true },

  // Digital signature
  digital_signature: { type: DataTypes.TEXT, allowNull: true },
  signature_verified: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Blockchain
  blockchain_tx: { type: DataTypes.STRING, allowNull: true },
  blockchain_verified: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  indexes: [
    { fields: ['procurement_id'] },
    { fields: ['bid_submission_id'] },
    { fields: ['bidder_id'] },
    { fields: ['rank'] },
    { fields: ['total_score'] }
  ]
});
