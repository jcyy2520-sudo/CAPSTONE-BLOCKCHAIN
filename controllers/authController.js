import { User } from "../models/userModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const registerStep1Post = async (req, res) => {
  // initialize session storage for registration
  req.session.registrationData = req.session.registrationData || {};
  req.session.registrationData.company = req.body.company;
  req.session.registrationData.email = req.body.email;
  req.session.registrationData.password = req.body.password;
  req.session.registrationData.tin = req.body.tin;
  req.session.registrationData.business_type = req.body.business_type;
  req.session.registrationData.industry_category = req.body.industry_category;
  res.redirect("/register/step2");
};

export const registerStep2Post = async (req, res) => {
  if (!req.session.registrationData) req.session.registrationData = {};
  req.session.registrationData.representative = req.body.representative;
  req.session.registrationData.designation = req.body.designation;
  req.session.registrationData.rep_email = req.body.rep_email;
  req.session.registrationData.contact = req.body.contact;
  res.redirect("/register/step3");
};

export const registerStep3Post = async (req, res) => {
  try {
    const reg = req.session.registrationData;
    if (!reg) return res.redirect("/register");

    // files are provided by multer in req.files
    const files = req.files || {};

    // optional: validate files exist
    if (!files.business_permit || !files.tax_clearance || !files.philgeps_cert || !files.financial_statements) {
      return res.status(400).send("All required documents must be uploaded.");
    }

    // hash password before saving
    const hashed = await bcrypt.hash(reg.password, 10);

    // Save uploaded file paths where multer stored them (req.files[].path)
    const bp = files.business_permit[0].path;
    const tc = files.tax_clearance[0].path;
    const pg = files.philgeps_cert[0].path;
    const fsPath = files.financial_statements[0].path;

    // compute SHA-256 of each uploaded file
    const fileHash = async (p) => {
      const full = path.resolve(process.cwd(), p);
      const data = await fs.promises.readFile(full);
      return crypto.createHash("sha256").update(data).digest("hex");
    };

    const bpHash = await fileHash(bp);
    const tcHash = await fileHash(tc);
    const pgHash = await fileHash(pg);
    const fsHash = await fileHash(fsPath);

    // build canonical payload to anchor
    const payload = {
      company: reg.company,
      email: reg.email,
      tin: reg.tin || null,
      business_type: reg.business_type || null,
      industry_category: reg.industry_category || null,
      representative_name: reg.representative || null,
      representative_email: reg.rep_email || null,
      representative_contact: reg.contact || null,
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

    // simulate a blockchain transaction id
    const txId = `tx_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const created = await User.create({
      name: reg.company,
      email: reg.email,
      password: hashed,
      tin: reg.tin || null,
      business_type: reg.business_type || null,
      industry_category: reg.industry_category || null,
      representative_name: reg.representative || null,
      representative_email: reg.rep_email || null,
      representative_contact: reg.contact || null,
      business_permit_path: bp,
      tax_clearance_path: tc,
      philgeps_cert_path: pg,
      financial_statements_path: fsPath,
      status: "pending",
      digital_procurement_id: digitalId,
      blockchain_tx: txId
    });

    // append to a local ledger to simulate anchoring
    try {
      const ledgerDir = path.join(process.cwd(), "blockchain");
      await fs.promises.mkdir(ledgerDir, { recursive: true });
      const ledgerLine = JSON.stringify({ id: created.id, digitalId, txId, payload }) + "\n";
      await fs.promises.appendFile(path.join(ledgerDir, "ledger.txt"), ledgerLine);
    } catch (err) {
      console.warn("Could not write to local ledger:", err.message);
    }

    // clear session registration data
    delete req.session.registrationData;
    res.redirect("/register/success");
  } catch (err) {
    console.error("Registration error:", err);
    // If connection refused, return a helpful message to the client
    const code = err && err.parent && err.parent.code;
    if (code === 'ECONNREFUSED') {
      return res.status(503).send("Registration failed: cannot connect to the database. Is MySQL running and the DB config correct?");
    }
    res.status(500).send("Registration failed");
  }
};
export const loginPage = (req, res) => {
  res.render("auth/login", { title: "Login - Procurement System" });
};

export const registerStep1 = (req, res) => {
  res.render("auth/register-step1", { title: "Bidder Registration - Company Setup" });
};

export const registerStep2 = (req, res) => {
  res.render("auth/register-step2", { title: "Bidder Registration - Representative" });
};

export const registerStep3 = (req, res) => {
  res.render("auth/register-step3", { title: "Bidder Registration - Documents" });
};

export const registerSuccess = (req, res) => {
  res.render("auth/register-success", { title: "Registration Verified" });
};

export const loginPost = async (req, res) => {
  try {
    const username = req.body.username;
    const password = req.body.password;

    // try lookup by email first, then by name
    let user = await User.findOne({ where: { email: username } });
    if (!user) {
      user = await User.findOne({ where: { name: username } });
    }

    if (!user) {
      req.flash("error_msg", "Invalid credentials");
      return res.redirect("/login");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash("error_msg", "Invalid credentials");
      return res.redirect("/login");
    }

    // Successful login: store minimal user info in session (include role)
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };

    // Redirect based on role
    if (user.role === 'admin') return res.redirect('/admin/dashboard');
    return res.redirect('/bidder/dashboard');
  } catch (err) {
    console.error("Login error:", err);
    req.flash("error_msg", "Login failed");
    return res.redirect("/login");
  }
};

export const logout = (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
};

export const adminListRegistrations = async (req, res) => {
  try {
    const pending = await User.findAll({ where: { status: 'pending' }, order: [['createdAt', 'ASC']] });
    return res.render('admin/registrations', { title: 'Review Registrations', pending });
  } catch (err) {
    console.error('Admin list error:', err);
    req.flash('error_msg', 'Could not load registrations');
    return res.redirect('/admin/dashboard');
  }
};

export const adminApproveRegistration = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findByPk(id);
    if (!user) {
      req.flash('error_msg', 'Registration not found');
      return res.redirect('/admin/registrations');
    }
    user.status = 'approved';
    user.approved_at = new Date();
    await user.save();
    req.flash('success_msg', 'Registration approved');
    return res.redirect('/admin/registrations');
  } catch (err) {
    console.error('Approve error:', err);
    req.flash('error_msg', 'Could not approve');
    return res.redirect('/admin/registrations');
  }
};

export const adminRejectRegistration = async (req, res) => {
  try {
    const id = req.params.id;
    const reason = req.body.reason || null;
    const user = await User.findByPk(id);
    if (!user) {
      req.flash('error_msg', 'Registration not found');
      return res.redirect('/admin/registrations');
    }
    user.status = 'rejected';
    user.rejected_reason = reason;
    await user.save();
    req.flash('success_msg', 'Registration rejected');
    return res.redirect('/admin/registrations');
  } catch (err) {
    console.error('Reject error:', err);
    req.flash('error_msg', 'Could not reject');
    return res.redirect('/admin/registrations');
  }
};
