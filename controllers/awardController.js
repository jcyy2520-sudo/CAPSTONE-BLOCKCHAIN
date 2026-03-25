/**
 * Award Management Controller
 * Handles Notice of Award (NOA) generation, contracts, and blockchain anchoring
 */

import { NoticeOfAward, Contract } from "../models/awardModel.js";
import { BidEvaluation } from "../models/bidEvaluationModel.js";
import { BidSubmission } from "../models/bidSubmissionModel.js";
import { Procurement } from "../models/procurementModel.js";
import { User } from "../models/userModel.js";
import blockchainService from "../services/blockchainService.js";
import { AuditLog } from "../models/auditModel.js";
import crypto from "crypto";

/**
 * GET /admin/procurement/:procurementId/award-winner
 * Show form to select and award winner
 */
export const showAwardWinnerForm = async (req, res) => {
  try {
    const { procurementId } = req.params;

    const procurement = await Procurement.findByPk(procurementId);
    if (!procurement) {
      req.flash('error_msg', 'Procurement not found');
      return res.redirect('/admin/dashboard');
    }

    // Get rankings
    const evaluations = await BidEvaluation.findAll({
      where: { procurement_id: procurementId },
      order: [['total_score', 'DESC']]
    });

    // Get bidder details
    const rankingsWithBidders = await Promise.all(
      evaluations.map(async (evalItem) => {
        const bidder = await User.findByPk(evalItem.bidder_id);
        const bid = await BidSubmission.findByPk(evalItem.bid_submission_id);
        return {
          ...evalItem.toJSON(),
          bidder_name: bidder?.name || 'Unknown',
          bidder_email: bidder?.email || 'N/A',
          bid_amount: bid?.bid_amount || 0
        };
      })
    );

    res.render("admin/award-winner-selection", {
      title: "Award Winner",
      procurement: procurement.toJSON(),
      rankings: rankingsWithBidders
    });
  } catch (err) {
    console.error("Error showing award form:", err);
    req.flash('error_msg', 'Error loading award form');
    return res.redirect('/admin/dashboard');
  }
};

/**
 * POST /admin/procurement/:procurementId/issue-noa
 * Issue Notice of Award (NOA)
 */
export const issueNoticeOfAward = async (req, res) => {
  try {
    const { procurementId } = req.params;
    const userId = req.session.user.id;
    const { winning_bid_id } = req.body;

    const procurement = await Procurement.findByPk(procurementId);
    if (!procurement) {
      return res.status(404).json({ error: 'Procurement not found' });
    }

    const bid = await BidSubmission.findByPk(winning_bid_id);
    if (!bid || bid.procurement_id !== parseInt(procurementId)) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Check if already awarded
    const existing = await NoticeOfAward.findOne({
      where: { procurement_id: procurementId }
    });

    if (existing) {
      return res.status(400).json({ error: 'Award already issued for this procurement' });
    }

    // Create NOA
    const noa = await NoticeOfAward.create({
      procurement_id: procurementId,
      winning_bid_id: winning_bid_id,
      winning_bidder_id: bid.bidder_id,
      awarded_amount: bid.bid_amount,
      award_date: new Date(),
      status: 'issued',
      approved_by: userId
    });

    // Update bid status
    await bid.update({ status: 'won' });

    // Record on blockchain
    const txResult = await blockchainService.recordTransaction(
      'award_issued',
      'NoticeOfAward',
      noa.id,
      {
        procurement_id: procurementId,
        winning_bid_id: winning_bid_id,
        bidder_id: bid.bidder_id,
        awarded_amount: bid.bid_amount,
        issued_by: userId
      },
      userId
    );

    await noa.update({ blockchain_tx: txResult.tx_hash });

    // Log action
    await AuditLog.create({
      user_id: userId,
      action: 'issue_noa',
      resource_type: 'NoticeOfAward',
      resource_id: noa.id,
      changes_after: { status: 'issued', awarded_amount: bid.bid_amount },
      status: 'success'
    });

    req.flash('success_msg', 'Notice of Award issued successfully');
    return res.redirect(`/admin/procurement/${procurementId}/award`);
  } catch (err) {
    console.error("NOA issuance error:", err);
    req.flash('error_msg', 'Error issuing NOA');
    return res.redirect(`/admin/procurement/${req.params.procurementId}`);
  }
};

/**
 * GET /admin/noa/:noaId/view
 * View NOA details
 */
export const viewNOA = async (req, res) => {
  try {
    const { noaId } = req.params;

    const noa = await NoticeOfAward.findByPk(noaId);
    if (!noa) {
      req.flash('error_msg', 'NOA not found');
      return res.redirect('/admin/dashboard');
    }

    const bidder = await User.findByPk(noa.winning_bidder_id);
    const bid = await BidSubmission.findByPk(noa.winning_bid_id);
    const procurement = await Procurement.findByPk(noa.procurement_id);

    res.render("admin/noa-view", {
      title: "Notice of Award",
      noa: noa.toJSON(),
      bidder: bidder?.toJSON(),
      bid: bid?.toJSON(),
      procurement: procurement?.toJSON()
    });
  } catch (err) {
    console.error("Error viewing NOA:", err);
    req.flash('error_msg', 'Error loading NOA');
    return res.redirect('/admin/dashboard');
  }
};

/**
 * POST /admin/noa/:noaId/create-contract
 * Create contract from NOA
 */
export const createContractFromNOA = async (req, res) => {
  try {
    const { noaId } = req.params;
    const userId = req.session.user.id;
    const { contract_start_date, contract_end_date, payment_terms } = req.body;

    const noa = await NoticeOfAward.findByPk(noaId);
    if (!noa) {
      return res.status(404).json({ error: 'NOA not found' });
    }

    // Generate contract number
    const contractNumber = `CON-${noa.procurement_id}-${Date.now().toString().slice(-6)}`;

    // Calculate duration
    const startDate = new Date(contract_start_date);
    const endDate = new Date(contract_end_date);
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Create contract
    const contract = await Contract.create({
      noa_id: noaId,
      procurement_id: noa.procurement_id,
      bidder_id: noa.winning_bidder_id,
      contract_number: contractNumber,
      status: 'draft',
      contract_amount: noa.awarded_amount,
      contract_start_date: startDate,
      contract_end_date: endDate,
      contract_duration_days: durationDays,
      payment_terms: payment_terms,
      currency: 'PHP'
    });

    // Record on blockchain
    await blockchainService.recordTransaction(
      'contract_created',
      'Contract',
      contract.id,
      {
        noa_id: noaId,
        contract_number: contractNumber,
        bidder_id: noa.winning_bidder_id,
        amount: noa.awarded_amount,
        duration_days: durationDays
      },
      userId
    );

    // Log action
    await AuditLog.create({
      user_id: userId,
      action: 'create_contract',
      resource_type: 'Contract',
      resource_id: contract.id,
      changes_after: { status: 'draft', contract_number: contractNumber },
      status: 'success'
    });

    req.flash('success_msg', 'Contract created successfully');
    return res.redirect(`/admin/contract/${contract.id}`);
  } catch (err) {
    console.error("Contract creation error:", err);
    req.flash('error_msg', 'Error creating contract');
    return res.redirect(`/admin/noa/${req.params.noaId}`);
  }
};

/**
 * GET /admin/contract/:contractId
 * View and edit contract
 */
export const viewContract = async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await Contract.findByPk(contractId);
    if (!contract) {
      req.flash('error_msg', 'Contract not found');
      return res.redirect('/admin/dashboard');
    }

    const contractee = await User.findByPk(contract.bidder_id);
    const procurement = await Procurement.findByPk(contract.procurement_id);

    res.render("admin/contract-view", {
      title: "Contract Management",
      contract: contract.toJSON(),
      contractee: contractee?.toJSON(),
      procurement: procurement?.toJSON()
    });
  } catch (err) {
    console.error("Error viewing contract:", err);
    req.flash('error_msg', 'Error loading contract');
    return res.redirect('/admin/dashboard');
  }
};

/**
 * POST /admin/contract/:contractId/sign
 * Sign contract (digital signature)
 */
export const signContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.session.user.id;

    const contract = await Contract.findByPk(contractId);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status !== 'draft') {
      return res.status(400).json({ error: 'Contract cannot be signed in current state' });
    }

    // Sign contract (in production, use actual RSA keys)
    const contractData = {
      contract_number: contract.contract_number,
      bidder_id: contract.bidder_id,
      amount: contract.contract_amount,
      start_date: contract.contract_start_date,
      end_date: contract.contract_end_date
    };

    const signature = blockchainService.calculateHash(contractData);

    await contract.update({
      status: 'signed',
      government_signatory_id: userId,
      government_signatory_date: new Date(),
      government_signature: signature
    });

    // Record on blockchain
    await blockchainService.recordTransaction(
      'contract_signed',
      'Contract',
      contractId,
      {
        contract_number: contract.contract_number,
        signed_by: userId,
        bid_id: contract.bidder_id
      },
      userId
    );

    // Log action
    await AuditLog.create({
      user_id: userId,
      action: 'sign_contract',
      resource_type: 'Contract',
      resource_id: contractId,
      changes_before: { status: 'draft' },
      changes_after: { status: 'signed' },
      status: 'success'
    });

    req.flash('success_msg', 'Contract signed successfully');
    return res.redirect(`/admin/contract/${contractId}`);
  } catch (err) {
    console.error("Contract signing error:", err);
    req.flash('error_msg', 'Error signing contract');
    return res.redirect(`/admin/contract/${req.params.contractId}`);
  }
};

/**
 * GET /admin/awards
 * List all awards issued
 */
export const listAwards = async (req, res) => {
  try {
    const awards = await NoticeOfAward.findAll({
      order: [['award_date', 'DESC']]
    });

    const awardDetails = await Promise.all(
      awards.map(async (award) => {
        const bidder = await User.findByPk(award.winning_bidder_id);
        const procurement = await Procurement.findByPk(award.procurement_id);
        return {
          ...award.toJSON(),
          bidder_name: bidder?.name || 'Unknown',
          procurement_title: procurement?.title || 'Unknown'
        };
      })
    );

    res.render("admin/awards-list", {
      title: "Awards Issued",
      awards: awardDetails
    });
  } catch (err) {
    console.error("Error listing awards:", err);
    req.flash('error_msg', 'Error loading awards');
    return res.redirect('/admin/dashboard');
  }
};
