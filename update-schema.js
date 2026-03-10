#!/usr/bin/env node
import { sequelize } from "./models/db.js";

async function run() {
  try {
    console.log("Running schema update (this will ALTER tables to match models)...");
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log("✅ Schema updated successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Schema update failed:", err);
    process.exit(1);
  }
}

run();
