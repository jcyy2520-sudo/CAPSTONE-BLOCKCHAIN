
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
import { loginPage, loginPost, logout, registerStep1, registerStep2, registerStep3, registerSuccess, registerStep1Post, registerStep2Post, registerStep3Post } from "../controllers/authController.js";
import {
  adminDashboard, adminDashboardRisk, noaGeneration, noaIssued,
  smartContract, verificationCertificate, bidEvaluation, bidScoring,
  finalRanking, redFlagResolution, resolutionHistory,
  bidderDashboard, bidderSubmission, bidSubmit,
  publicTransparency, auditReport, auditFlags
} from "../controllers/pageController.js";

const router = express.Router();
router.get("/", loginPage);

// Auth routes
router.get("/login", loginPage);
router.post("/login", loginPost);
router.get("/logout", logout);
router.get("/register", registerStep1);
router.post("/register", registerStep1Post);
router.get("/register/step2", registerStep2);
router.post("/register/step2", registerStep2Post);
router.get("/register/step3", registerStep3);
const upload = multer({ dest: "uploads/" });
router.post("/register/step3", upload.fields([
  { name: "business_permit", maxCount: 1 },
  { name: "tax_clearance", maxCount: 1 },
  { name: "philgeps_cert", maxCount: 1 },
  { name: "financial_statements", maxCount: 1 }
]), registerStep3Post);
router.get("/register/success", registerSuccess);

// Admin registration review routes
function ensureAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  req.flash('error_msg', 'Administrator access required');
  return res.redirect('/login');
}

import { adminListRegistrations, adminApproveRegistration, adminRejectRegistration } from "../controllers/authController.js";
router.get('/admin/registrations', ensureAdmin, adminListRegistrations);
router.post('/admin/registrations/:id/approve', ensureAdmin, adminApproveRegistration);
router.post('/admin/registrations/:id/reject', ensureAdmin, adminRejectRegistration);

// Admin routes
router.get("/admin/dashboard", adminDashboard);
router.get("/admin/dashboard-risk", adminDashboardRisk);
router.get("/admin/noa-generation", noaGeneration);
router.get("/admin/noa-issued", noaIssued);
router.get("/admin/smart-contract", smartContract);
router.get("/admin/verification", verificationCertificate);
router.get("/admin/bid-evaluation", bidEvaluation);
router.get("/admin/bid-scoring", bidScoring);
router.get("/admin/final-ranking", finalRanking);
router.get("/admin/red-flag-resolution", redFlagResolution);
router.get("/admin/resolution-history", resolutionHistory);

// Bidder routes
router.get("/bidder/dashboard", bidderDashboard);
router.get("/bidder/submission", bidderSubmission);
router.get("/bidder/bid-submit", bidSubmit);
router.get("/bidder/documents", (req, res) => res.render("bidder/documents", { title: "My Documents" }));
router.get("/bidder/bid-status", (req, res) => res.render("bidder/bid-status", { title: "Bid Status" }));
router.get("/bidder/profile", (req, res) => res.render("bidder/profile", { title: "My Profile" }));
router.get("/bidder/support", (req, res) => res.render("bidder/support", { title: "Support" }));

// Public routes
router.get("/public/transparency", publicTransparency);

// Audit routes
router.get("/audit/report", auditReport);
router.get("/audit/flags", auditFlags);
router.get("/audit/projects", (req, res) => res.render("audit/projects", { title: "Projects" }));
router.get("/audit/audit-logs", (req, res) => res.render("audit/audit-logs", { title: "Audit Logs" }));
router.get("/audit/red-flag-resolution", (req, res) => res.render("audit/red-flag-resolution", { title: "Red Flag Resolution" }));
router.get("/audit/resolution-history", (req, res) => res.render("audit/resolution-history", { title: "Resolution History" }));

export default router;
