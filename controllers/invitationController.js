import { ProcurementInvitation } from "../models/procurementInvitationModel.js";
import { Procurement } from "../models/procurementModel.js";
import { User } from "../models/userModel.js";
import { Sequelize } from "sequelize";

/**
 * GET /bidder/invitations
 * Show invitations for the logged-in bidder
 */
export const listInvitations = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const invitations = await ProcurementInvitation.findAll({
      where: { user_id: userId },
      order: [['invited_at', 'DESC']]
    });

    // Fetch procurement details for each invitation
    const formattedInvitations = await Promise.all(invitations.map(async (inv) => {
      const procurement = await Procurement.findByPk(inv.procurement_id);
      return {
        id: inv.id,
        procurement_id: inv.procurement_id,
        procurement_title: procurement?.title || 'Unknown',
        procurement_mode: procurement?.mode || 'Unknown',
        status: inv.status,
        invited_at: inv.invited_at,
        responded_at: inv.responded_at,
        bid_closing_date: procurement?.bid_closing_date
      };
    }));

    res.render("bidder/invitations", {
      title: "Procurement Invitations",
      invitations: formattedInvitations
    });
  } catch (err) {
    console.error("Error listing invitations:", err);
    req.flash('error_msg', 'Error retrieving invitations');
    return res.redirect('/bidder/dashboard');
  }
};

/**
 * POST /bidder/invitations/:id/accept
 * Accept an invitation to participate in procurement
 */
export const acceptInvitation = async (req, res) => {
  try {
    const invitationId = req.params.id;
    const userId = req.session.user.id;

    const invitation = await ProcurementInvitation.findByPk(invitationId);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.user_id !== userId) {
      req.flash('error_msg', 'This invitation is not for you');
      return res.redirect('/bidder/invitations');
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'This invitation has already been responded to' });
    }

    await invitation.update({
      status: 'accepted',
      responded_at: new Date()
    });

    req.flash('success_msg', 'Invitation accepted successfully');
    return res.redirect(`/bidder/procurement/${invitation.procurement_id}`);
  } catch (err) {
    console.error("Error accepting invitation:", err);
    req.flash('error_msg', 'Error accepting invitation');
    return res.redirect('/bidder/invitations');
  }
};

/**
 * POST /bidder/invitations/:id/reject
 * Reject an invitation
 */
export const rejectInvitation = async (req, res) => {
  try {
    const invitationId = req.params.id;
    const userId = req.session.user.id;

    const invitation = await ProcurementInvitation.findByPk(invitationId);

    if (!invitation) {
      req.flash('error_msg', 'Invitation not found');
      return res.redirect('/bidder/invitations');
    }

    if (invitation.user_id !== userId) {
      req.flash('error_msg', 'This invitation is not for you');
      return res.redirect('/bidder/invitations');
    }

    if (invitation.status !== 'pending') {
      req.flash('error_msg', 'This invitation has already been responded to');
      return res.redirect('/bidder/invitations');
    }

    await invitation.update({
      status: 'rejected',
      responded_at: new Date()
    });

    req.flash('success_msg', 'Invitation declined');
    return res.redirect('/bidder/invitations');
  } catch (err) {
    console.error("Error rejecting invitation:", err);
    req.flash('error_msg', 'Error declining invitation');
    return res.redirect('/bidder/invitations');
  }
};

/**
 * POST /admin/procurement/:id/invite
 * Invite bidders to a procurement
 */
export const inviteBidders = async (req, res) => {
  try {
    const procurementId = req.params.id;
    const { bidder_ids, mode } = req.body;

    const procurement = await Procurement.findByPk(procurementId);

    if (!procurement) {
      req.flash('error_msg', 'Procurement not found');
      return res.redirect('/admin/dashboard');
    }

    const bidderArray = Array.isArray(bidder_ids) ? bidder_ids : [bidder_ids];
    let invitedCount = 0;

    for (const bidderId of bidderArray) {
      // Check if invitation already exists
      const existingInvitation = await ProcurementInvitation.findOne({
        where: {
          procurement_id: procurementId,
          user_id: bidderId
        }
      });

      if (!existingInvitation) {
        await ProcurementInvitation.create({
          procurement_id: procurementId,
          user_id: bidderId,
          status: 'pending'
        });
        invitedCount++;
      }
    }

    req.flash('success_msg', `${invitedCount} bidder(s) invited successfully`);
    return res.redirect(`/admin/procurement/${procurementId}`);
  } catch (err) {
    console.error("Error inviting bidders:", err);
    req.flash('error_msg', 'Error sending invitations');
    return res.redirect('/admin/dashboard');
  }
};

/**
 * GET /admin/procurement/:id/invite-bidders
 * Show form to select and invite bidders
 */
export const showInviteBiddersForm = async (req, res) => {
  try {
    const procurementId = req.params.id;

    const procurement = await Procurement.findByPk(procurementId);

    if (!procurement) {
      req.flash('error_msg', 'Procurement not found');
      return res.redirect('/admin/dashboard');
    }

    // Get all approved bidders
    const approvedBidders = await User.findAll({
      where: {
        role: 'bidder',
        [Sequelize.Op.or]: [
          { status: 'approved' },
          { application_status: 'approved' }
        ]
      }
    });

    // Get already invited bidders for this procurement
    const alreadyInvited = await ProcurementInvitation.findAll({
      where: { procurement_id: procurementId },
      attributes: ['user_id']
    });

    const invitedIds = alreadyInvited.map(inv => inv.user_id);

    const availableBidders = approvedBidders.filter(b => !invitedIds.includes(b.id));

    res.render("admin/invite-bidders", {
      title: "Invite Bidders",
      procurement: procurement.toJSON(),
      bidders: availableBidders.map(b => b.toJSON())
    });
  } catch (err) {
    console.error("Error showing invite form:", err);
    req.flash('error_msg', 'Error loading bidders');
    return res.redirect('/admin/dashboard');
  }
};

/**
 * GET /admin/procurement/:id/invitations
 * View all invitations for a procurement
 */
export const viewProcurementInvitations = async (req, res) => {
  try {
    const procurementId = req.params.id;

    const procurement = await Procurement.findByPk(procurementId);

    if (!procurement) {
      req.flash('error_msg', 'Procurement not found');
      return res.redirect('/admin/dashboard');
    }

    const invitations = await ProcurementInvitation.findAll({
      where: { procurement_id: procurementId },
      order: [['invited_at', 'DESC']]
    });

    // Fetch bidder details for each invitation
    const formattedInvitations = await Promise.all(invitations.map(async (inv) => {
      const user = await User.findByPk(inv.user_id, {
        attributes: ['id', 'name', 'email']
      });
      return {
        id: inv.id,
        user_id: inv.user_id,
        user_name: user?.name || 'Unknown',
        user_email: user?.email || 'N/A',
        status: inv.status,
        invited_at: inv.invited_at,
        responded_at: inv.responded_at
      };
    }));

    res.render("admin/procurement-invitations", {
      title: "Procurement Invitations",
      procurement: procurement.toJSON(),
      invitations: formattedInvitations
    });
  } catch (err) {
    console.error("Error viewing invitations:", err);
    req.flash('error_msg', 'Error retrieving invitations');
    return res.redirect('/admin/dashboard');
  }
};
