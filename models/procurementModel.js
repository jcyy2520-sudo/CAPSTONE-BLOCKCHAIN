import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const Procurement = sequelize.define("Procurement", {
  reference_no: { type: DataTypes.STRING, allowNull: false, unique: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  abc: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
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
    defaultValue: 'Competitive Bidding'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Draft'
  },
  template_id: { type: DataTypes.INTEGER, allowNull: true },
  bid_opening_date: { type: DataTypes.DATE, allowNull: true },
  bid_closing_date: { type: DataTypes.DATE, allowNull: true },
  required_documents: { type: DataTypes.JSON, allowNull: true },
  procuring_unit: { type: DataTypes.STRING, allowNull: true },
  approving_authority: { type: DataTypes.STRING, allowNull: true }
});
