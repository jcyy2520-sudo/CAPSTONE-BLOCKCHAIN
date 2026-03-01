
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
import { loginPage, registerStep1, registerStep2, registerStep3, registerSuccess } from "../controllers/authController.js";
import {
  adminDashboard, adminDashboardRisk, noaGeneration, noaIssued,
  smartContract, verificationCertificate, bidEvaluation, bidScoring,
  finalRanking, redFlagResolution, resolutionHistory,
  bidderDashboard, bidderSubmission, bidSubmit,
  publicTransparency, auditReport, auditFlags
} from "../controllers/pageController.js";

const router = express.Router();
router.get("/", homePage);

// Auth routes
router.get("/login", loginPage);
router.get("/register", registerStep1);
router.get("/register/step2", registerStep2);
router.get("/register/step3", registerStep3);
router.get("/register/success", registerSuccess);

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

// Public routes
router.get("/public/transparency", publicTransparency);

// Audit routes
router.get("/audit/report", auditReport);
router.get("/audit/flags", auditFlags);

export default router;
