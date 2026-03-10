#!/usr/bin/env node
import bcrypt from "bcrypt";
import { User } from "./models/userModel.js";
import { sequelize } from "./models/db.js";

const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASS = process.env.ADMIN_PASS || "admin123";

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Connected to DB");
    const existing = await User.findOne({ where: { email: EMAIL } });
    if (existing) {
      console.log("Admin already exists:", EMAIL);
      process.exit(0);
    }
    const hashed = await bcrypt.hash(PASS, 10);
    const admin = await User.create({ name: "Administrator", email: EMAIL, password: hashed, role: "admin", status: "approved", approved_at: new Date() });
    console.log("Created admin:", admin.email);
    process.exit(0);
  } catch (err) {
    console.error("Failed to create admin:", err);
    process.exit(1);
  }
}

run();
