

      /*
    MIT License
    
    Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
    Mindoro State University - Philippines

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";

export const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  // Company / registration fields
  tin: { type: DataTypes.STRING, allowNull: true },
  business_type: { type: DataTypes.STRING, allowNull: true },
  industry_category: { type: DataTypes.STRING, allowNull: true },
  representative_name: { type: DataTypes.STRING, allowNull: true },
  representative_email: { type: DataTypes.STRING, allowNull: true },
  representative_contact: { type: DataTypes.STRING, allowNull: true },
  // Uploaded document paths / metadata
  business_permit_path: { type: DataTypes.STRING, allowNull: true },
  tax_clearance_path: { type: DataTypes.STRING, allowNull: true },
  philgeps_cert_path: { type: DataTypes.STRING, allowNull: true },
  financial_statements_path: { type: DataTypes.STRING, allowNull: true },
  // registration status
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" }
  ,
  // Blockchain anchoring
  digital_procurement_id: { type: DataTypes.STRING, allowNull: true },
  blockchain_tx: { type: DataTypes.STRING, allowNull: true }
  ,
  // role and admin review fields
  role: { type: DataTypes.STRING, allowNull: false, defaultValue: "bidder" },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  rejected_reason: { type: DataTypes.TEXT, allowNull: true },

  // Application workflow fields
  application_status: { type: DataTypes.ENUM('pending_application', 'under_verification', 'approved', 'rejected'), allowNull: true },
  application_submitted_at: { type: DataTypes.DATE, allowNull: true },
  verified_at: { type: DataTypes.DATE, allowNull: true },
  verified_by: { type: DataTypes.INTEGER, allowNull: true },
  verification_notes: { type: DataTypes.TEXT, allowNull: true },
  password_created: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
});
export { sequelize }; 
