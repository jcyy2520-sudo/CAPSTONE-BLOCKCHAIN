import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const BidderApplication = sequelize.define("BidderApplication", {
  company_name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, validate: { isEmail: true } },
  tin: { type: DataTypes.STRING, allowNull: true },
  business_type: { type: DataTypes.STRING, allowNull: true },
  industry_category: { type: DataTypes.STRING, allowNull: true },
  representative_name: { type: DataTypes.STRING, allowNull: true },
  representative_email: { type: DataTypes.STRING, allowNull: true },
  representative_contact: { type: DataTypes.STRING, allowNull: true },

  // Document paths
  business_permit_path: { type: DataTypes.STRING, allowNull: true },
  tax_clearance_path: { type: DataTypes.STRING, allowNull: true },
  philgeps_cert_path: { type: DataTypes.STRING, allowNull: true },
  financial_statements_path: { type: DataTypes.STRING, allowNull: true },

  // Application workflow
  status: {
    type: DataTypes.ENUM('pending', 'under_verification', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  submitted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  verified_at: { type: DataTypes.DATE, allowNull: true },
  verified_by: { type: DataTypes.INTEGER, allowNull: true },
  verification_notes: { type: DataTypes.TEXT, allowNull: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },

  // Blockchain
  digital_procurement_id: { type: DataTypes.STRING, allowNull: true },
  blockchain_tx: { type: DataTypes.STRING, allowNull: true }
});
