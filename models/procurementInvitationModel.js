import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const ProcurementInvitation = sequelize.define("ProcurementInvitation", {
  procurement_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },

  // Status of invitation
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'withdrawn'),
    allowNull: false,
    defaultValue: 'pending'
  },
  invited_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  responded_at: { type: DataTypes.DATE, allowNull: true },

  // Notes
  notes: { type: DataTypes.TEXT, allowNull: true }
}, {
  indexes: [
    { fields: ['procurement_id', 'user_id'], unique: true }
  ]
});
