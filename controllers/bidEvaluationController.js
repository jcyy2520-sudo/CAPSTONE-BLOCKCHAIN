/**
 * Bid Evaluation Controller
 * Handles bid opening, scoring, ranking, and blockchain anchoring
 */

import { BidSubmission } from "../models/bidSubmissionModel.js";
import { BidEvaluation } from "../models/bidEvaluationModel.js";
import { Procurement } from "../models/procurementModel.js";
import { ProcurementTemplate } from "../models/procurementTemplateModel.js";
import { User } from "../models/userModel.js";
import blockchainService from "../services/blockchainService.js";
import { AuditLog } from "../models/auditModel.js";

/**
 * GET /admin/procurement/:procurementId/bids
 * List all bids for a procurement
 */
export const listProcurementBids = async (req, res) => {
  try {
    const { procurementId } = req.params;

    const procurement = await Procurement.findByPk(procurementId);
    if (!procurement) {
      req.flash('error_msg', 'Procurement not found');
      return res.redirect('/admin/dashboard');
    }

    const bids = await BidSubmission.findAll({
      where: { procurement_id: procurementId },
      order: [['submission_date', 'DESC']]
    });

    // Get bidder details for each bid
    const bidDetails = await Promise.all(bids.map(async (bid) => {
      const bidder = await User.findByPk(bid.bidder_id);
      const evaluation = await BidEvaluation.findOne({
        where: { bid_submission_id: bid.id }
      });
      return {
        ...bid.toJSON(),
        bidder_name: bidder?.name || 'Unknown',
        bidder_email: bidder?.email || 'N/A',
        evaluation_status: evaluation?.status || 'pending'
      };
    }));

    res.render("admin/bid-list", {
      title: "Bids for " + procurement.title,
      procurement: procurement.toJSON(),
      bids: bidDetails
    });
  } catch (err) {
    console.error("Error listing bids:", err);
    req.flash('error_msg', 'Error loading bids');
    return res.redirect('/admin/dashboard');
  }
};

/**
 * POST /admin/procurement/:procurementId/open-bids
 * Open bids (change status from submitted to opened)
 */
export const openBids = async (req, res) => {
  try {
    const { procurementId } = req.params;
    const userId = req.session.user.id;

    const procurement = await Procurement.findByPk(procurementId);
    if (!procurement) {
      return res.status(404).json({ error: 'Procurement not found' });
    }

    // Update all submitted bids to opened status
    const updatedCount = await BidSubmission.update(
      { status: 'opened' },
      { where: { procurement_id: procurementId, status: 'submitted' } }
    );

    // Record on blockchain
    await blockchainService.recordTransaction(
      'bid_opening',
      'Procurement',
      procurementId,
      {
        procurement_id: procurementId,
        bids_opened: updatedCount[0]
      },
      userId
    );

    // Log action
    await AuditLog.create({
      user_id: userId,
      action: 'open_bids',
      resource_type: 'Procurement',
      resource_id: procurementId,
      status: 'success'
    });

    req.flash('success_msg', `${updatedCount[0]} bids opened`);
    return res.redirect(`/admin/procurement/${procurementId}/bids`);
  } catch (err) {
    console.error("Error opening bids:", err);
    req.flash('error_msg', 'Error opening bids');
    return res.redirect(`/admin/procurement/${req.params.procurementId}/bids`);
  }
};

/**
 * GET /admin/procurement/:procurementId/evaluate/:bidId
 * Show bid evaluation form
 */
export const showEvaluationForm = async (req, res) => {
  try {
    const { procurementId, bidId } = req.params;

    const bid = await BidSubmission.findByPk(bidId);
    if (!bid || bid.procurement_id !== parseInt(procurementId)) {
      req.flash('error_msg', 'Bid not found');
      return res.redirect(`/admin/procurement/${procurementId}/bids`);
    }

    const bidder = await User.findByPk(bid.bidder_id);
    const procurement = await Procurement.findByPk(procurementId);
    const template = await ProcurementTemplate.findOne({
      where: { mode: procurement.mode }
    });

    const evaluation = await BidEvaluation.findOne({
      where: { bid_submission_id: bidId }
    });

    res.render("admin/bid-evaluation-form", {
      title: "Evaluate Bid",
      bid: bid.toJSON(),
      bidder: bidder?.toJSON(),
      procurement: procurement?.toJSON(),
      template: template?.toJSON(),
      evaluation: evaluation ? evaluation.toJSON() : null,
      evaluation_criteria: template?.evaluation_criteria || {}
    });
  } catch (err) {
    console.error("Error showing evaluation form:", err);
    req.flash('error_msg', 'Error loading evaluation form');
    return res.redirect(`/admin/procurement/${req.params.procurementId}/bids`);
  }
};

/**
 * POST /admin/procurement/:procurementId/evaluate/:bidId
 * Submit bid evaluation and scoring
 */
export const submitEvaluation = async (req, res) => {
  try {
    const { procurementId, bidId } = req.params;
    const userId = req.session.user.id;
    const {
      technical_score,
      technical_remarks,
      financial_score,
      financial_remarks
    } = req.body;

    const bid = await BidSubmission.findByPk(bidId);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const procurement = await Procurement.findByPk(procurementId);
    const template = await ProcurementTemplate.findOne({
      where: { mode: procurement.mode }
    });

    // Get evaluation criteria weights
    const criteria = template?.evaluation_criteria || {
      technical: { weight: 50 },
      financial: { weight: 50 }
    };

    // Calculate weighted scores
    const technicalScore = parseFloat(technical_score);
    const financialScore = parseFloat(financial_score);
    const weightedTechnical = (technicalScore * criteria.technical.weight) / 100;
    const weightedFinancial = (financialScore * criteria.financial.weight) / 100;
    const totalScore = weightedTechnical + weightedFinancial;

    // Create or update evaluation
    let evaluation = await BidEvaluation.findOne({
      where: { bid_submission_id: bidId }
    });

    const evaluationData = {
      procurement_id: procurementId,
      bid_submission_id: bidId,
      bidder_id: bid.bidder_id,
      technical_score: technicalScore,
      technical_remarks: technical_remarks,
      financial_score: financialScore,
      financial_remarks: financial_remarks,
      weighted_technical: weightedTechnical,
      weighted_financial: weightedFinancial,
      total_score: totalScore,
      status: 'evaluated',
      evaluated_by: userId,
      evaluated_at: new Date(),
      evaluator_remarks: req.body.evaluator_remarks || ''
    };

    if (evaluation) {
      await evaluation.update(evaluationData);
    } else {
      evaluation = await BidEvaluation.create(evaluationData);
    }

    // Update bid status
    await bid.update({ status: 'evaluated' });

    // Record on blockchain
    await blockchainService.recordTransaction(
      'bid_evaluated',
      'BidEvaluation',
      evaluation.id,
      {
        bid_submission_id: bidId,
        technical_score: technicalScore,
        financial_score: financialScore,
        total_score: totalScore,
        evaluated_by: userId
      },
      userId
    );

    // Log action
    await AuditLog.create({
      user_id: userId,
      action: 'evaluate_bid',
      resource_type: 'BidEvaluation',
      resource_id: evaluation.id,
      changes_before: { status: 'pending' },
      changes_after: { status: 'evaluated', total_score: totalScore },
      status: 'success'
    });

    req.flash('success_msg', `Bid evaluated. Total Score: ${totalScore.toFixed(2)}`);
    return res.redirect(`/admin/procurement/${procurementId}/bids`);
  } catch (err) {
    console.error("Evaluation error:", err);
    req.flash('error_msg', 'Error submitting evaluation');
    return res.redirect(`/admin/procurement/${req.params.procurementId}/bids`);
  }
};

/**
 * GET /admin/procurement/:procurementId/rankings
 * Show bid rankings and evaluation results
 */
export const showRankings = async (req, res) => {
  try {
    const { procurementId } = req.params;

    const procurement = await Procurement.findByPk(procurementId);
    if (!procurement) {
      req.flash('error_msg', 'Procurement not found');
      return res.redirect('/admin/dashboard');
    }

    // Get all evaluations, ranked by total score
    const evaluations = await BidEvaluation.findAll({
      where: { procurement_id: procurementId },
      order: [['total_score', 'DESC']]
    });

    // Assign ranks
    let currentRank = 1;
    const rankedEvaluations = evaluations.map((evalItem, index) => {
      if (index > 0 && evalItem.total_score < evaluations[index - 1].total_score) {
        currentRank = index + 1;
      }
      return {
        ...evalItem.toJSON(),
        rank: currentRank
      };
    });

    // Update database with ranks
    for (const evalData of rankedEvaluations) {
      await evalData.update({ rank: evalData.rank });
    }

    // Get bidder details
    const rankingsWithBidders = await Promise.all(
      rankedEvaluations.map(async (evalItem) => {
        const bidder = await User.findByPk(evalItem.bidder_id);
        const bid = await BidSubmission.findByPk(evalItem.bid_submission_id);
        return {
          ...evalItem,
          bidder_name: bidder?.name || 'Unknown',
          bidder_email: bidder?.email || 'N/A',
          bid_amount: bid?.bid_amount || 0
        };
      })
    );

    res.render("admin/bid-rankings", {
      title: "Bid Rankings",
      procurement: procurement.toJSON(),
      rankings: rankingsWithBidders
    });
  } catch (err) {
    console.error("Error showing rankings:", err);
    req.flash('error_msg', 'Error loading rankings');
    return res.redirect('/admin/dashboard');
  }
};

/**
 * GET /admin/procurement/:procurementId/evaluation-summary
 * Summary of all evaluations for a procurement
 */
export const getEvaluationSummary = async (req, res) => {
  try {
    const { procurementId } = req.params;

    const evaluations = await BidEvaluation.findAll({
      where: { procurement_id: procurementId },
      order: [['total_score', 'DESC']]
    });

    const stats = {
      total_bids_received: evaluations.length,
      evaluated_bids: evaluations.filter(e => e.status === 'evaluated').length,
      pending_evaluations: evaluations.filter(e => e.status === 'pending').length,
      average_score: evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + (e.total_score || 0), 0) / evaluations.length
        : 0,
      highest_score: evaluations[0]?.total_score || 0,
      lowest_score: evaluations[evaluations.length - 1]?.total_score || 0
    };

    return res.json({
      procurement_id: procurementId,
      stats: stats,
      evaluations: evaluations.map(e => ({
        bid_id: e.bid_submission_id,
        bidder_id: e.bidder_id,
        technical_score: e.technical_score,
        financial_score: e.financial_score,
        total_score: e.total_score,
        rank: e.rank,
        status: e.status
      }))
    });
  } catch (err) {
    console.error("Error getting evaluation summary:", err);
    return res.status(500).json({ error: 'Error loading summary' });
  }
};
