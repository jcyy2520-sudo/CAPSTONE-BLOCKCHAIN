import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const ProcurementTemplate = sequelize.define("ProcurementTemplate", {
  mode: {
    type: DataTypes.ENUM(
      'Competitive Bidding',
      'Limited Source Bidding',
      'Direct Contracting',
      'Repeat Order',
      'Small Value Procurement',
      'Negotiated Procurement',
      'Competitive Dialogue',
      'Unsolicited Offer with Bid Matching',
      'Direct Acquisition',
      'Direct Sales',
      'Direct Procurement for Science, Technology and Innovation'
    ),
    allowNull: false,
    unique: true
  },
  description: { type: DataTypes.TEXT, allowNull: true },

  // Required documents for bidder pre-qualification
  required_bidder_documents: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [
      { name: 'business_permit', label: 'Business Permit', required: true, format: 'PDF' },
      { name: 'tax_clearance', label: 'Tax Clearance', required: true, format: 'PDF' },
      { name: 'philgeps_cert', label: 'PhilGEPS Certificate', required: true, format: 'PDF' },
      { name: 'financial_statements', label: 'Financial Statements (Last 2 Years)', required: true, format: 'PDF' }
    ]
  },

  // Required documents for bid submission
  required_bid_documents: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [
      { name: 'technical_proposal', label: 'Technical Proposal', required: true, format: 'PDF,DOCX' },
      { name: 'financial_proposal', label: 'Financial Proposal', required: true, format: 'XLSX,PDF' }
    ]
  },

  // Evaluation criteria (JSON)
  evaluation_criteria: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      technical: { weight: 50, description: 'Technical score' },
      financial: { weight: 50, description: 'Financial score' }
    }
  },

  // Notes/instructions for this mode
  notes: { type: DataTypes.TEXT, allowNull: true }
});
