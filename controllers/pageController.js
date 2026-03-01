// Page Controller — All design pages (no database)

// Admin Pages
export const adminDashboard = (req, res) => {
  res.render("admin/dashboard", { title: "BAC Admin Dashboard" });
};

export const adminDashboardRisk = (req, res) => {
  res.render("admin/dashboard-risk", { title: "Dashboard — Risk View" });
};

export const noaGeneration = (req, res) => {
  res.render("admin/noa-generation", { title: "NOA Generation" });
};

export const noaIssued = (req, res) => {
  res.render("admin/noa-issued", { title: "Notice of Award — Issued" });
};

export const smartContract = (req, res) => {
  res.render("admin/smart-contract", { title: "Smart Contract Configuration" });
};

export const verificationCertificate = (req, res) => {
  res.render("admin/verification-certificate", { title: "Blockchain Verification" });
};

export const bidEvaluation = (req, res) => {
  res.render("admin/bid-evaluation", { title: "Bid Evaluation" });
};

export const bidScoring = (req, res) => {
  res.render("admin/bid-scoring", { title: "Bidder Scoring" });
};

export const finalRanking = (req, res) => {
  res.render("admin/final-ranking", { title: "Final Ranking" });
};

export const redFlagResolution = (req, res) => {
  res.render("audit/red-flag-resolution", { title: "Red Flag Resolution" });
};

export const resolutionHistory = (req, res) => {
  res.render("audit/resolution-history", { title: "Resolution History" });
};

// Bidder Pages
export const bidderDashboard = (req, res) => {
  res.render("bidder/dashboard", { title: "Bidder Dashboard" });
};

export const bidderSubmission = (req, res) => {
  res.render("bidder/submission", { title: "Bid Submission Portal" });
};

export const bidSubmit = (req, res) => {
  res.render("bidder/bid-submit", { title: "Submit Bid" });
};

// Public Pages
export const publicTransparency = (req, res) => {
  res.render("public/transparency", { title: "Public Transparency Portal" });
};

// Audit Pages
export const auditReport = (req, res) => {
  res.render("audit/report", { title: "COA Audit Report" });
};

export const auditFlags = (req, res) => {
  res.render("audit/flags", { title: "Audit — Flagged Items" });
};
