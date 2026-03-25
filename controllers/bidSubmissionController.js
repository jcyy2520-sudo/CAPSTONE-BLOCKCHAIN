/**
 * Bid Submission Controller
 * Handles bidder bid submission, document upload, and blockchain anchoring
 */

import { BidSubmission } from "../models/bidSubmissionModel.js";
import { Procurement } from "../models/procurementModel.js";
import { ProcurementInvitation } from "../models/procurementInvitationModel.js";
import blockchainService from "../services/blockchainService.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * GET /bidder/procurement/:procurementId
 * Show procurement details and bid submission form
 */
export const showProcurementDetails = async (req, res) => {
  try {
    const { procurementId } = req.params;
    const userId = req.session.user.id;

    const procurement = await Procurement.findByPk(procurementId);
    if (!procurement) {
      req.flash('error_msg', 'Procurement not found');
      return res.redirect('/bidder/invitations');
    }

    // Check if bidder is invited
    const invitation = await ProcurementInvitation.findOne({
      where: { procurement_id: procurementId, user_id: userId }
    });

    if (!invitation || invitation.status !== 'accepted') {
      req.flash('error_msg', 'You are not invited to this procurement');
      return res.redirect('/bidder/invitations');
    }

    // Check for existing bid submission
    const existingBid = await BidSubmission.findOne({
      where: {
        procurement_id: procurementId,
        bidder_id: userId
      }
    });

    res.render("bidder/procurement-details", {
      title: procurement.title,
      procurement: procurement.toJSON(),
      existingBid: existingBid ? existingBid.toJSON() : null
    });
  } catch (err) {
    console.error("Error showing procurement details:", err);
    req.flash('error_msg', 'Error loading procurement details');
    return res.redirect('/bidder/invitations');
  }
};

/**
 * POST /bidder/procurement/:procurementId/submit-bid
 * Submit a bid with technical and financial proposals
 */
export const submitBid = async (req, res) => {
  try {
    const { procurementId } = req.params;
    const userId = req.session.user.id;
    const { bid_amount } = req.body;
    const files = req.files || {};

    // Validate procurement exists
    const procurement = await Procurement.findByPk(procurementId);
    if (!procurement) {
      req.flash('error_msg', 'Procurement not found');
      return res.redirect('/bidder/invitations');
    }

    // Check if bid is still open
    if (procurement.bid_closing_date && new Date() > new Date(procurement.bid_closing_date)) {
      req.flash('error_msg', 'Bid submission period has closed');
      return res.redirect(`/bidder/procurement/${procurementId}`);
    }

    // Validate invitation
    const invitation = await ProcurementInvitation.findOne({
      where: { procurement_id: procurementId, user_id: userId, status: 'accepted' }
    });

    if (!invitation) {
      req.flash('error_msg', 'You are not invited to this procurement');
      return res.redirect('/bidder/invitations');
    }

    // Process file uploads
    const technicalProposalPath = files.technical_proposal ? files.technical_proposal[0].path : null;
    const financialProposalPath = files.financial_proposal ? files.financial_proposal[0].path : null;

    if (!technicalProposalPath || !financialProposalPath) {
      req.flash('error_msg', 'Technical and financial proposals are required');
      return res.redirect(`/bidder/procurement/${procurementId}`);
    }

    // Calculate file hashes
    const fileHash = async (filePath) => {
      if (!filePath) return null;
      const full = path.resolve(process.cwd(), filePath);
      const data = await fs.promises.readFile(full);
      return crypto.createHash("sha256").update(data).digest("hex");
    };

    const technicalHash = await fileHash(technicalProposalPath);
    const financialHash = await fileHash(financialProposalPath);

    // Create sealed bid hash (combines both proposals and bid amount)
    const sealedBidData = {
      technical_hash: technicalHash,
      financial_hash: financialHash,
      bid_amount: bid_amount,
      timestamp: Date.now()
    };
    const sealedBidHash = blockchainService.calculateHash(sealedBidData);

    // Create or update bid submission
    let bidSubmission = await BidSubmission.findOne({
      where: { procurement_id: procurementId, bidder_id: userId }
    });

    if (bidSubmission && bidSubmission.status !== 'draft') {
      req.flash('error_msg', 'You have already submitted a bid for this procurement');
      return res.redirect(`/bidder/procurement/${procurementId}`);
    }

    const bidData = {
      procurement_id: procurementId,
      bidder_id: userId,
      technical_proposal_path: technicalProposalPath,
      financial_proposal_path: financialProposalPath,
      status: 'submitted',
      submission_date: new Date(),
      bid_amount: bid_amount,
      bid_currency: 'PHP',
      technical_hash: technicalHash,
      financial_hash: financialHash,
      bid_sealing_hash: sealedBidHash
    };

    if (bidSubmission) {
      await bidSubmission.update(bidData);
    } else {
      bidSubmission = await BidSubmission.create(bidData);
    }

    // Record on blockchain
    const txResult = await blockchainService.recordTransaction(
      'bid_submitted',
      'BidSubmission',
      bidSubmission.id,
      {
        procurement_id: procurementId,
        bidder_id: userId,
        bid_amount: bid_amount,
        technical_hash: technicalHash,
        financial_hash: financialHash,
        sealed_bid_hash: sealedBidHash
      },
      userId
    );

    await bidSubmission.update({
      blockchain_tx: txResult.tx_hash,
      digital_procurement_id: txResult.tx_hash
    });

    req.flash('success_msg', `Bid submitted successfully. Transaction: ${txResult.tx_hash.substring(0, 16)}...`);
    return res.redirect(`/bidder/bid-status/${bidSubmission.id}`);
  } catch (err) {
    console.error("Bid submission error:", err);
    req.flash('error_msg', 'Bid submission failed. Please try again.');
    return res.redirect(`/bidder/procurement/${req.params.procurementId}`);
  }
};

/**
 * GET /bidder/bid-status/:bidId
 * View bid submission status and confirmation
 */
export const viewBidStatus = async (req, res) => {
  try {
    const bidId = req.params.bidId;
    const userId = req.session.user.id;

    const bid = await BidSubmission.findByPk(bidId);
    if (!bid || bid.bidder_id !== userId) {
      req.flash('error_msg', 'Bid not found');
      return res.redirect('/bidder/invitations');
    }

    const procurement = await Procurement.findByPk(bid.procurement_id);

    res.render("bidder/bid-status", {
      title: "Bid Status",
      bid: bid.toJSON(),
      procurement: procurement ? procurement.toJSON() : null
    });
  } catch (err) {
    console.error("Error viewing bid status:", err);
    req.flash('error_msg', 'Error loading bid status');
    return res.redirect('/bidder/invitations');
  }
};

/**
 * GET /bidder/my-bids
 * List all bidder's bid submissions
 */
export const listMyBids = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const bids = await BidSubmission.findAll({
      where: { bidder_id: userId },
      order: [['submission_date', 'DESC']]
    });

    // Get procurement details for each bid
    const bidDetails = await Promise.all(bids.map(async (bid) => {
      const procurement = await Procurement.findByPk(bid.procurement_id);
      return {
        ...bid.toJSON(),
        procurement_title: procurement?.title || 'Unknown',
        procurement_mode: procurement?.mode || 'Unknown'
      };
    }));

    res.render("bidder/my-bids", {
      title: "My Bids",
      bids: bidDetails
    });
  } catch (err) {
    console.error("Error listing bids:", err);
    req.flash('error_msg', 'Error loading bids');
    return res.redirect('/bidder/dashboard');
  }
};

/**
 * GET /bidder/bid/:bidId/download/:document
 * Download bid document (technical or financial)
 */
export const downloadBidDocument = async (req, res) => {
  try {
    const { bidId, document } = req.params;
    const userId = req.session.user.id;

    const bid = await BidSubmission.findByPk(bidId);
    if (!bid || bid.bidder_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const filePath = document === 'technical'
      ? bid.technical_proposal_path
      : bid.financial_proposal_path;

    if (!filePath) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fullPath = path.resolve(process.cwd(), filePath);

    // Log access in blockchain
    await blockchainService.recordTransaction(
      'bid_document_downloaded',
      'BidSubmission',
      bidId,
      {
        document_type: document,
        bid_id: bidId,
        bidder_id: userId
      },
      userId
    );

    res.download(fullPath);
  } catch (err) {
    console.error("Error downloading document:", err);
    return res.status(500).json({ error: 'Download failed' });
  }
};

/**
 * POST /bidder/bid/:bidId/withdraw
 * Withdraw a bid (only if not yet opened)
 */
export const withdrawBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.session.user.id;

    const bid = await BidSubmission.findByPk(bidId);
    if (!bid || bid.bidder_id !== userId) {
      req.flash('error_msg', 'Bid not found');
      return res.redirect('/bidder/my-bids');
    }

    if (bid.status !== 'submitted') {
      req.flash('error_msg', 'This bid cannot be withdrawn');
      return res.redirect(`/bidder/bid-status/${bidId}`);
    }

    await bid.update({ status: 'withdrawn' });

    // Log withdrawal
    await blockchainService.recordTransaction(
      'bid_withdrawn',
      'BidSubmission',
      bidId,
      { bid_id: bidId, bidder_id: userId },
      userId
    );

    req.flash('success_msg', 'Bid withdrawn successfully');
    return res.redirect('/bidder/my-bids');
  } catch (err) {
    console.error("Error withdrawing bid:", err);
    req.flash('error_msg', 'Error withdrawing bid');
    return res.redirect('/bidder/my-bids');
  }
};
