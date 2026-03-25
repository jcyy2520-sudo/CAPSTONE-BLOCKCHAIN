
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
    
import express from "express";
import { homePage } from "../controllers/homeController.js";
import multer from "multer";
import { loginPage, loginPost, logout } from "../controllers/authController.js";
import {
  adminDashboard, adminDashboardRisk, noaGeneration, noaIssued,
  smartContract, verificationCertificate, bidEvaluation, bidScoring,
  finalRanking, redFlagResolution, resolutionHistory,
  bidderDashboard, bidderSubmission, bidSubmit,
  publicTransparency, auditReport, auditFlags
} from "../controllers/pageController.js";
import {
  showApplicationForm, submitApplication, checkApplicationStatus,
  listApplications, viewApplicationDetail, verifyApplication, rejectApplication
} from "../controllers/applicationController.js";
import {
  listTemplates, viewTemplate, saveTemplate, getProcurementTemplate, procurementSetup
} from "../controllers/templateController.js";
import {
  listInvitations, acceptInvitation, rejectInvitation, inviteBidders,
  showInviteBiddersForm, viewProcurementInvitations
} from "../controllers/invitationController.js";
import {
  showProcurementDetails, submitBid, viewBidStatus, listMyBids, downloadBidDocument, withdrawBid
} from "../controllers/bidSubmissionController.js";
import {
  listProcurementBids, openBids, showEvaluationForm, submitEvaluation, showRankings, getEvaluationSummary
} from "../controllers/bidEvaluationController.js";
import {
  showAwardWinnerForm, issueNoticeOfAward, viewNOA, createContractFromNOA, viewContract, signContract, listAwards
} from "../controllers/awardController.js";
import {
  getBlockchainStats, showBlockchainDashboard, verifyBlockchain, listBlocks, viewBlock,
  listTransactions, viewTransaction, showBlockchainExplorer, exportBlockchainData
} from "../controllers/blockchainController.js";
import {
  listAuditLogs, viewAuditLog, generateAuditReport, getAuditTrail, listRedFlags,
  generateComplianceReport, trackDocuments, exportAuditReport
} from "../controllers/auditController.js";
import {
  ensureAuthenticated, ensureAdmin, ensureBidder, ensureApprovedBidder, ensureRole
} from "../middleware/authMiddleware.js";
import {
  csrfProtection, verifyCSRFToken
} from "../middleware/csrfMiddleware.js";
import {
  globalRateLimiter, loginRateLimiter, apiRateLimiter, bidSubmissionRateLimiter
} from "../middleware/rateLimitMiddleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Public routes (no auth required)
router.get("/", loginPage);
router.get("/login", loginPage);
router.post("/login", loginPost);
router.get("/public/transparency", publicTransparency);

// Bidder application routes (public, no auth required)
router.get("/bidder/apply", showApplicationForm);
router.post("/bidder/apply", upload.fields([
  { name: "business_permit", maxCount: 1 },
  { name: "tax_clearance", maxCount: 1 },
  { name: "philgeps_cert", maxCount: 1 },
  { name: "financial_statements", maxCount: 1 }
]), submitApplication);

// Application status (public - check by ID)
router.get("/bidder/application-status/:id", checkApplicationStatus);

// Authenticated routes
router.get("/logout", ensureAuthenticated, logout);

// Admin routes - ALL protected with ensureAdmin
router.get("/admin/dashboard", ensureAdmin, adminDashboard);
router.get("/admin/dashboard-risk", ensureAdmin, adminDashboardRisk);
router.get("/admin/noa-generation", ensureAdmin, noaGeneration);
router.get("/admin/noa-issued", ensureAdmin, noaIssued);
router.get("/admin/smart-contract", ensureAdmin, smartContract);
router.get("/admin/verification", ensureAdmin, verificationCertificate);
router.get("/admin/bid-evaluation", ensureAdmin, bidEvaluation);
router.get("/admin/bid-scoring", ensureAdmin, bidScoring);
router.get("/admin/final-ranking", ensureAdmin, finalRanking);
router.get("/admin/red-flag-resolution", ensureAdmin, redFlagResolution);
router.get("/admin/resolution-history", ensureAdmin, resolutionHistory);

// Application management routes (admin only)
router.get("/admin/applications", ensureAdmin, listApplications);
router.get("/admin/applications/:id", ensureAdmin, viewApplicationDetail);
router.post("/admin/applications/:id/verify", ensureAdmin, verifyApplication);
router.post("/admin/applications/:id/reject", ensureAdmin, rejectApplication);

// Procurement template routes (admin only)
router.get("/admin/procurement/templates", ensureAdmin, listTemplates);
router.get("/admin/procurement/templates/:mode", ensureAdmin, viewTemplate);
router.post("/admin/procurement/templates/:mode", ensureAdmin, saveTemplate);
router.get("/admin/procurement-setup/:mode", ensureAdmin, procurementSetup);

// Procurement invitation routes (admin only)
router.get("/admin/procurement/:id/invite-bidders", ensureAdmin, showInviteBiddersForm);
router.post("/admin/procurement/:id/invite", ensureAdmin, inviteBidders);
router.get("/admin/procurement/:id/invitations", ensureAdmin, viewProcurementInvitations);

// Bidder routes - ALL protected with ensureBidder
router.get("/bidder/dashboard", ensureBidder, bidderDashboard);
router.get("/bidder/submission", ensureBidder, bidderSubmission);
router.get("/bidder/bid-submit", ensureBidder, bidSubmit);
router.get("/bidder/documents", ensureBidder, (req, res) => res.render("bidder/documents", { title: "My Documents" }));
router.get("/bidder/bid-status", ensureBidder, (req, res) => res.render("bidder/bid-status", { title: "Bid Status" }));
router.get("/bidder/profile", ensureBidder, (req, res) => res.render("bidder/profile", { title: "My Profile" }));
router.get("/bidder/support", ensureBidder, (req, res) => res.render("bidder/support", { title: "Support" }));

// Bidder invitation routes
router.get("/bidder/invitations", ensureBidder, listInvitations);
router.post("/bidder/invitations/:id/accept", ensureBidder, acceptInvitation);
router.post("/bidder/invitations/:id/reject", ensureBidder, rejectInvitation);

// Bidder bid submission routes
router.get("/bidder/procurement/:procurementId", ensureBidder, showProcurementDetails);
router.post("/bidder/procurement/:procurementId/submit-bid", ensureBidder, upload.fields([
  { name: "technical_proposal", maxCount: 1 },
  { name: "financial_proposal", maxCount: 1 }
]), submitBid);
router.get("/bidder/bid-status/:bidId", ensureBidder, viewBidStatus);
router.get("/bidder/my-bids", ensureBidder, listMyBids);
router.get("/bidder/bid/:bidId/download/:document", ensureBidder, downloadBidDocument);
router.post("/bidder/bid/:bidId/withdraw", ensureBidder, withdrawBid);

// Admin bid management routes
router.get("/admin/procurement/:procurementId/bids", ensureAdmin, listProcurementBids);
router.post("/admin/procurement/:procurementId/open-bids", ensureAdmin, openBids);
router.get("/admin/procurement/:procurementId/evaluate/:bidId", ensureAdmin, showEvaluationForm);
router.post("/admin/procurement/:procurementId/evaluate/:bidId", ensureAdmin, submitEvaluation);
router.get("/admin/procurement/:procurementId/rankings", ensureAdmin, showRankings);
router.get("/admin/procurement/:procurementId/evaluation-summary", ensureAdmin, getEvaluationSummary);

// Admin award management routes
router.get("/admin/procurement/:procurementId/award-winner", ensureAdmin, showAwardWinnerForm);
router.post("/admin/procurement/:procurementId/issue-noa", ensureAdmin, issueNoticeOfAward);
router.get("/admin/noa/:noaId/view", ensureAdmin, viewNOA);
router.post("/admin/noa/:noaId/create-contract", ensureAdmin, createContractFromNOA);
router.get("/admin/contract/:contractId", ensureAdmin, viewContract);
router.post("/admin/contract/:contractId/sign", ensureAdmin, signContract);
router.get("/admin/awards", ensureAdmin, listAwards);

// Audit routes (admin/authenticated)
router.get("/audit/logs", ensureAdmin, listAuditLogs);
router.get("/audit/log/:logId", ensureAdmin, viewAuditLog);
router.get("/audit/report", ensureAdmin, generateAuditReport);
router.get("/audit/trail/:resourceType/:resourceId", ensureAdmin, getAuditTrail);
router.get("/audit/red-flags", ensureAdmin, listRedFlags);
router.get("/audit/compliance", ensureAdmin, generateComplianceReport);
router.get("/audit/documents", ensureAdmin, trackDocuments);
router.get("/audit/export-report", ensureAdmin, exportAuditReport);

// Blockchain routes (admin only)
router.get("/admin/blockchain/dashboard", ensureAdmin, showBlockchainDashboard);
router.post("/admin/blockchain/verify", ensureAdmin, verifyBlockchain);
router.get("/admin/blockchain/blocks", ensureAdmin, listBlocks);
router.get("/admin/blockchain/block/:blockNumber", ensureAdmin, viewBlock);
router.get("/admin/blockchain/transactions", ensureAdmin, listTransactions);
router.get("/admin/blockchain/transaction/:txHash", ensureAdmin, viewTransaction);
router.get("/admin/blockchain/explorer", ensureAdmin, showBlockchainExplorer);
router.get("/admin/blockchain/export", ensureAdmin, exportBlockchainData);

// API endpoints
router.get("/api/procurement-template/:procurementId", getProcurementTemplate);
router.get("/api/blockchain/stats", ensureAdmin, async (req, res) => {
  try {
    const blockchainService = (await import("../services/blockchainService.js")).default;
    const stats = await blockchainService.getBlockchainStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.post("/api/blockchain/verify", ensureAdmin, async (req, res) => {
  try {
    const blockchainService = (await import("../services/blockchainService.js")).default;
    const result = await blockchainService.verifyBlockchain();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/api/blockchain/block/:blockNumber", ensureAdmin, async (req, res) => {
  try {
    const blockchainService = (await import("../services/blockchainService.js")).default;
    const block = await blockchainService.getBlock(req.params.blockNumber);
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/api/audit/trail/:resourceType/:resourceId", ensureAdmin, async (req, res) => {
  try {
    const auditService = (await import("../services/auditService.js")).default;
    const trail = await auditService.getAuditTrail(req.params.resourceType, req.params.resourceId);
    res.json(trail);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/api/audit/report", ensureAdmin, async (req, res) => {
  try {
    const auditService = (await import("../services/auditService.js")).default;
    const { startDate, endDate, userId, action } = req.query;
    const report = await auditService.generateAuditReport(startDate, endDate, {
      userId: userId ? parseInt(userId) : null,
      action
    });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
