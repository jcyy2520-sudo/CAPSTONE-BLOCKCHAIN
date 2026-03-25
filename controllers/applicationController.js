import { User } from "../models/userModel.js";
import { BidderApplication } from "../models/bidderApplicationModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * GET /bidder/apply
 * Show the bidder application form (public, no auth required)
 */
export const showApplicationForm = (req, res) => {
  res.render("bidder/apply", { title: "Apply as Bidder" });
};

/**
 * POST /bidder/apply
 * Submit a bidder application with documents
 */
export const submitApplication = async (req, res) => {
  try {
    const reqBody = req.body;
    const files = req.files || {};

    // Validate required fields
    if (!reqBody.company_name || !reqBody.email) {
      req.flash('error_msg', 'Company name and email are required');
      return res.redirect('/bidder/apply');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: reqBody.email } });
    const existingApp = await BidderApplication.findOne({ where: { email: reqBody.email } });

    if (existingUser || existingApp) {
      req.flash('error_msg', 'An account or application with this email already exists');
      return res.redirect('/bidder/apply');
    }

    // Process document paths
    const bp = files.business_permit ? files.business_permit[0].path : null;
    const tc = files.tax_clearance ? files.tax_clearance[0].path : null;
    const pg = files.philgeps_cert ? files.philgeps_cert[0].path : null;
    const fsPath = files.financial_statements ? files.financial_statements[0].path : null;

    // Create file hashes for blockchain
    const fileHash = async (p) => {
      if (!p) return null;
      const full = path.resolve(process.cwd(), p);
      const data = await fs.promises.readFile(full);
      return crypto.createHash("sha256").update(data).digest("hex");
    };

    const bpHash = await fileHash(bp);
    const tcHash = await fileHash(tc);
    const pgHash = await fileHash(pg);
    const fsHash = await fileHash(fsPath);

    // Create blockchain payload
    const payload = {
      company_name: reqBody.company_name,
      email: reqBody.email,
      tin: reqBody.tin || null,
      business_type: reqBody.business_type || null,
      industry_category: reqBody.industry_category || null,
      representative_name: reqBody.representative_name || null,
      representative_email: reqBody.representative_email || null,
      representative_contact: reqBody.representative_contact || null,
      files: {
        business_permit: bpHash,
        tax_clearance: tcHash,
        philgeps_cert: pgHash,
        financial_statements: fsHash
      },
      ts: new Date().toISOString()
    };

    const canonical = JSON.stringify(payload);
    const digitalId = crypto.createHash("sha256").update(canonical).digest("hex");
    const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // Create bidder application record
    const application = await BidderApplication.create({
      company_name: reqBody.company_name,
      email: reqBody.email,
      tin: reqBody.tin || null,
      business_type: reqBody.business_type || null,
      industry_category: reqBody.industry_category || null,
      representative_name: reqBody.representative_name || null,
      representative_email: reqBody.representative_email || null,
      representative_contact: reqBody.representative_contact || null,
      business_permit_path: bp,
      tax_clearance_path: tc,
      philgeps_cert_path: pg,
      financial_statements_path: fsPath,
      status: 'pending',
      digital_procurement_id: digitalId,
      blockchain_tx: txId
    });

    // Write to blockchain ledger
    try {
      const ledgerDir = path.join(process.cwd(), "blockchain");
      await fs.promises.mkdir(ledgerDir, { recursive: true });
      const ledgerLine = JSON.stringify({
        type: 'application',
        id: application.id,
        digitalId,
        txId,
        payload
      }) + "\n";
      await fs.promises.appendFile(path.join(ledgerDir, "ledger.txt"), ledgerLine);
    } catch (err) {
      console.warn("Could not write to local ledger:", err.message);
    }

    req.flash('success_msg', `Application submitted successfully. Your application ID is: ${application.id}`);
    return res.redirect(`/bidder/application-status/${application.id}`);
  } catch (err) {
    console.error("Application submission error:", err);
    req.flash('error_msg', 'Application submission failed. Please try again.');
    return res.redirect('/bidder/apply');
  }
};

/**
 * GET /bidder/application-status/:id
 * Show application status for a bidder
 */
export const checkApplicationStatus = async (req, res) => {
  try {
    const application = await BidderApplication.findByPk(req.params.id);

    if (!application) {
      req.flash('error_msg', 'Application not found');
      return res.redirect('/bidder/apply');
    }

    res.render("bidder/application-status", {
      title: "Application Status",
      application: application.toJSON()
    });
  } catch (err) {
    console.error("Error checking application status:", err);
    req.flash('error_msg', 'Error retrieving application status');
    return res.redirect('/bidder/apply');
  }
};

/**
 * GET /admin/applications
 * List all bidder applications (admin only)
 */
export const listApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const applications = await BidderApplication.findAll({
      where,
      order: [['submitted_at', 'DESC']]
    });

    res.render("admin/applications", {
      title: "Bidder Applications",
      applications: applications.map(app => app.toJSON()),
      statusFilter: status || 'all'
    });
  } catch (err) {
    console.error("Error listing applications:", err);
    req.flash('error_msg', 'Error retrieving applications');
    return res.redirect('/admin/dashboard');
  }
};

/**
 * GET /admin/applications/:id
 * View detailed application for review
 */
export const viewApplicationDetail = async (req, res) => {
  try {
    const application = await BidderApplication.findByPk(req.params.id);

    if (!application) {
      req.flash('error_msg', 'Application not found');
      return res.redirect('/admin/applications');
    }

    res.render("admin/application-detail", {
      title: "Review Application",
      application: application.toJSON()
    });
  } catch (err) {
    console.error("Error viewing application:", err);
    req.flash('error_msg', 'Error retrieving application details');
    return res.redirect('/admin/applications');
  }
};

/**
 * POST /admin/applications/:id/verify
 * Verify application and create user account
 */
export const verifyApplication = async (req, res) => {
  try {
    const application = await BidderApplication.findByPk(req.params.id);

    if (!application) {
      req.flash('error_msg', 'Application not found');
      return res.redirect('/admin/applications');
    }

    if (application.status !== 'pending') {
      req.flash('error_msg', 'Only pending applications can be verified');
      return res.redirect(`/admin/applications/${application.id}`);
    }

    const verificationNotes = req.body.verification_notes || '';

    // Generate temporary password
    const tempPassword = `Bidder_${Date.now().toString().slice(-6)}`;
    const hashed = await bcrypt.hash(tempPassword, 10);

    // Create user account
    const user = await User.create({
      name: application.company_name,
      email: application.email,
      password: hashed,
      tin: application.tin,
      business_type: application.business_type,
      industry_category: application.industry_category,
      representative_name: application.representative_name,
      representative_email: application.representative_email,
      representative_contact: application.representative_contact,
      business_permit_path: application.business_permit_path,
      tax_clearance_path: application.tax_clearance_path,
      philgeps_cert_path: application.philgeps_cert_path,
      financial_statements_path: application.financial_statements_path,
      status: 'approved',
      digital_procurement_id: application.digital_procurement_id,
      blockchain_tx: application.blockchain_tx,
      role: 'bidder',
      approved_at: new Date(),
      application_status: 'approved',
      application_submitted_at: application.submitted_at,
      verified_at: new Date(),
      verified_by: req.session.user.id,
      verification_notes: verificationNotes,
      password_created: false
    });

    // Update application record
    await application.update({
      status: 'approved',
      verified_at: new Date(),
      verified_by: req.session.user.id,
      verification_notes: verificationNotes
    });

    // Log to blockchain
    try {
      const ledgerDir = path.join(process.cwd(), "blockchain");
      const ledgerLine = JSON.stringify({
        type: 'application_verified',
        application_id: application.id,
        user_id: user.id,
        verified_by: req.session.user.id,
        verified_at: new Date().toISOString()
      }) + "\n";
      await fs.promises.appendFile(path.join(ledgerDir, "ledger.txt"), ledgerLine);
    } catch (err) {
      console.warn("Could not write to ledger:", err.message);
    }

    req.flash('success_msg', `Application approved. Temporary password: ${tempPassword} (Share securely with bidder)`);
    return res.redirect('/admin/applications');
  } catch (err) {
    console.error("Application verification error:", err);
    req.flash('error_msg', 'Error verifying application');
    return res.redirect(`/admin/applications/${req.params.id}`);
  }
};

/**
 * POST /admin/applications/:id/reject
 * Reject application with reason
 */
export const rejectApplication = async (req, res) => {
  try {
    const application = await BidderApplication.findByPk(req.params.id);

    if (!application) {
      req.flash('error_msg', 'Application not found');
      return res.redirect('/admin/applications');
    }

    if (application.status !== 'pending' && application.status !== 'under_verification') {
      req.flash('error_msg', 'Only pending or under-verification applications can be rejected');
      return res.redirect(`/admin/applications/${application.id}`);
    }

    const rejectionReason = req.body.rejection_reason || 'No reason provided';

    await application.update({
      status: 'rejected',
      rejection_reason: rejectionReason,
      verified_at: new Date(),
      verified_by: req.session.user.id
    });

    // Log to blockchain
    try {
      const ledgerDir = path.join(process.cwd(), "blockchain");
      const ledgerLine = JSON.stringify({
        type: 'application_rejected',
        application_id: application.id,
        rejection_reason: rejectionReason,
        rejected_by: req.session.user.id,
        rejected_at: new Date().toISOString()
      }) + "\n";
      await fs.promises.appendFile(path.join(ledgerDir, "ledger.txt"), ledgerLine);
    } catch (err) {
      console.warn("Could not write to ledger:", err.message);
    }

    req.flash('success_msg', 'Application rejected successfully');
    return res.redirect('/admin/applications');
  } catch (err) {
    console.error("Application rejection error:", err);
    req.flash('error_msg', 'Error rejecting application');
    return res.redirect(`/admin/applications/${req.params.id}`);
  }
};
