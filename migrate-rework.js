/**
 * Database migration script for procurement system rework
 * Creates all tables for bidding, evaluation, awards, and blockchain
 */

import { User } from "./models/userModel.js";
import { Procurement } from "./models/procurementModel.js";
import { BidderApplication } from "./models/bidderApplicationModel.js";
import { ProcurementTemplate } from "./models/procurementTemplateModel.js";
import { ProcurementInvitation } from "./models/procurementInvitationModel.js";
import { BidSubmission } from "./models/bidSubmissionModel.js";
import { BidEvaluation } from "./models/bidEvaluationModel.js";
import { NoticeOfAward, Contract } from "./models/awardModel.js";
import { AuditLog, DocumentMetadata } from "./models/auditModel.js";
import { BlockchainBlock, BlockchainTransaction, BlockchainState } from "./models/blockchainModel.js";
import { sequelize } from "./models/db.js";

async function runMigrations() {
  try {
    console.log("🚀 Starting comprehensive database migrations...\n");

    // Sync all models
    await sequelize.sync({ alter: true });

    console.log("✅ User table synchronized");
    console.log("✅ Procurement table synchronized");
    console.log("✅ BidderApplication table created/updated");
    console.log("✅ ProcurementTemplate table created/updated");
    console.log("✅ ProcurementInvitation table created/updated");
    console.log("✅ BidSubmission table created/updated");
    console.log("✅ BidEvaluation table created/updated");
    console.log("✅ NoticeOfAward table created/updated");
    console.log("✅ Contract table created/updated");
    console.log("✅ AuditLog table created/updated");
    console.log("✅ DocumentMetadata table created/updated");
    console.log("✅ BlockchainBlock table created/updated");
    console.log("✅ BlockchainTransaction table created/updated");
    console.log("✅ BlockchainState table created/updated");

    // Create default procurement templates for each mode
    const modes = [
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
    ];

    console.log("\n📋 Creating default procurement templates...");

    for (const mode of modes) {
      const existing = await ProcurementTemplate.findOne({ where: { mode } });
      if (!existing) {
        await ProcurementTemplate.create({
          mode,
          description: `Template for ${mode}`,
          required_bidder_documents: [
            { name: 'business_permit', label: 'Business Permit', required: true, format: 'PDF' },
            { name: 'tax_clearance', label: 'Tax Clearance', required: true, format: 'PDF' },
            { name: 'philgeps_cert', label: 'PhilGEPS Certificate', required: true, format: 'PDF' },
            { name: 'financial_statements', label: 'Financial Statements', required: true, format: 'PDF' }
          ],
          required_bid_documents: [
            { name: 'technical_proposal', label: 'Technical Proposal', required: true, format: 'PDF,DOCX' },
            { name: 'financial_proposal', label: 'Financial Proposal', required: true, format: 'XLSX,PDF' }
          ],
          evaluation_criteria: {
            technical: { weight: 50, description: 'Technical score' },
            financial: { weight: 50, description: 'Financial score' }
          }
        });
        console.log(`  ✅ Created template: ${mode}`);
      }
    }

    console.log("\n✅ All migrations completed successfully!");
    console.log("\n📊 DATABASE STRUCTURE:");
    console.log("  ├── Users & Applications (User, BidderApplication)");
    console.log("  ├── Procurements (Procurement, ProcurementTemplate, ProcurementInvitation)");
    console.log("  ├── Bidding (BidSubmission, BidEvaluation)");
    console.log("  ├── Awards & Contracts (NoticeOfAward, Contract)");
    console.log("  ├── Compliance (AuditLog, DocumentMetadata)");
    console.log("  ├── Blockchain (BlockchainBlock, BlockchainTransaction, BlockchainState)");
    console.log("\n🔗 BLOCKCHAIN FEATURES:");
    console.log("  ✅ Hash chains with SHA-256");
    console.log("  ✅ Merkle tree for transaction verification");
    console.log("  ✅ Proof of work (mining)");
    console.log("  ✅ Complete audit trail");
    console.log("  ✅ Digital signatures support");
    console.log("\n📌 SYSTEM CAPABILITIES:");
    console.log("  ✅ Bidder application & verification");
    console.log("  ✅ Procurement invitations");
    console.log("  ✅ Bid submission & sealing");
    console.log("  ✅ Bid evaluation & scoring");
    console.log("  ✅ Winner selection & NOA");
    console.log("  ✅ Contract management & signing");
    console.log("  ✅ Comprehensive audit logging");
    console.log("  ✅ Blockchain anchoring of all events");
    console.log("\n🚀 READY FOR:");
    console.log("  1. Test the complete procurement workflow");
    console.log("  2. Verify blockchain integrity");
    console.log("  3. Review audit logs");
    console.log("  4. Run full system tests");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
