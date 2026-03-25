/**
 * Audit Controller
 * Handles audit logging, reports, and compliance
 */

import { AuditLog, DocumentMetadata } from "../models/auditModel.js";
import { BlockchainTransaction } from "../models/blockchainModel.js";
import { User } from "../models/userModel.js";
import { BidSubmission } from "../models/bidSubmissionModel.js";
import { Procurement } from "../models/procurementModel.js";
import auditService from "../services/auditService.js";
import { sequelize } from "../models/db.js";

/**
 * GET /audit/logs
 * List audit logs with filters
 */
export const listAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const action = req.query.action || null;
    const resourceType = req.query.resource_type || null;
    const userId = req.query.user_id || null;
    const limit = 25;
    const offset = (page - 1) * limit;

    const where = {};
    if (action) where.action = action;
    if (resourceType) where.resource_type = resourceType;
    if (userId) where.user_id = parseInt(userId);

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // Get user details for each log
    const logsWithUsers = await Promise.all(logs.map(async (log) => {
      const user = log.user_id ? await User.findByPk(log.user_id) : null;
      return {
        ...log.toJSON(),
        user_name: user?.name || 'System'
      };
    }));

    // Get available filters
    const actions = await AuditLog.findAll({
      attributes: ['action'],
      raw: true,
      group: ['action'],
      subQuery: false
    });

    const resourceTypes = await AuditLog.findAll({
      attributes: ['resource_type'],
      raw: true,
      group: ['resource_type'],
      subQuery: false
    });

    const totalPages = Math.ceil(count / limit);

    res.render("audit/audit-logs", {
      title: "Audit Logs",
      logs: logsWithUsers,
      actions: actions.map(a => a.action),
      resource_types: resourceTypes.map(r => r.resource_type),
      selected_action: action,
      selected_resource_type: resourceType,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: count,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });
  } catch (err) {
    console.error("Error listing audit logs:", err);
    req.flash('error_msg', 'Error loading audit logs');
    res.redirect('/audit/report');
  }
};

/**
 * GET /audit/log/:logId
 * View specific audit log entry
 */
export const viewAuditLog = async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await AuditLog.findByPk(logId);
    if (!log) {
      req.flash('error_msg', 'Audit log not found');
      return res.redirect('/audit/logs');
    }

    const user = log.user_id ? await User.findByPk(log.user_id) : null;

    res.render("audit/audit-log-detail", {
      title: "Audit Log Details",
      log: {
        ...log.toJSON(),
        changes_before: log.changes_before ? JSON.parse(JSON.stringify(log.changes_before)) : null,
        changes_after: log.changes_after ? JSON.parse(JSON.stringify(log.changes_after)) : null
      },
      user: user ? user.toJSON() : null
    });
  } catch (err) {
    console.error("Error viewing audit log:", err);
    req.flash('error_msg', 'Error loading audit log');
    res.redirect('/audit/logs');
  }
};

/**
 * GET /audit/report
 * Generate and display audit report
 */
export const generateAuditReport = async (req, res) => {
  try {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    const userId = req.query.user_id || null;

    const where = {
      created_at: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    };

    if (userId) {
      where.user_id = parseInt(userId);
    }

    const logs = await AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    // Aggregate statistics
    const stats = {
      total_actions: logs.length,
      successful_actions: logs.filter(l => l.status === 'success').length,
      failed_actions: logs.filter(l => l.status === 'failure').length,
      by_action: {},
      by_resource_type: {},
      by_user: {},
      success_rate: 0
    };

    // Calculate distributions
    logs.forEach(log => {
      // By action
      if (!stats.by_action[log.action]) {
        stats.by_action[log.action] = 0;
      }
      stats.by_action[log.action]++;

      // By resource type
      if (!stats.by_resource_type[log.resource_type]) {
        stats.by_resource_type[log.resource_type] = 0;
      }
      stats.by_resource_type[log.resource_type]++;

      // By user
      const userId = log.user_id || 'System';
      if (!stats.by_user[userId]) {
        stats.by_user[userId] = 0;
      }
      stats.by_user[userId]++;
    });

    // Calculate success rate
    stats.success_rate = stats.total_actions > 0
      ? ((stats.successful_actions / stats.total_actions) * 100).toFixed(2)
      : 0;

    // Get user details
    const logsWithUsers = await Promise.all(logs.map(async (log) => {
      const user = log.user_id ? await User.findByPk(log.user_id) : null;
      return {
        ...log.toJSON(),
        user_name: user?.name || 'System'
      };
    }));

    res.render("audit/audit-report", {
      title: "Audit Report",
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      stats,
      logs: logsWithUsers,
      selected_user_id: userId
    });
  } catch (err) {
    console.error("Error generating audit report:", err);
    req.flash('error_msg', 'Error generating report');
    res.redirect('/audit/report');
  }
};

/**
 * GET /audit/trail/:resourceType/:resourceId
 * Get audit trail for a specific resource
 */
export const getAuditTrail = async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;

    const trail = await AuditLog.findAll({
      where: {
        resource_type: resourceType,
        resource_id: parseInt(resourceId)
      },
      order: [['created_at', 'ASC']]
    });

    const trailWithUsers = await Promise.all(trail.map(async (log) => {
      const user = log.user_id ? await User.findByPk(log.user_id) : null;
      return {
        ...log.toJSON(),
        user_name: user?.name || 'System'
      };
    }));

    res.render("audit/audit-trail", {
      title: `Audit Trail - ${resourceType} #${resourceId}`,
      resource_type: resourceType,
      resource_id: resourceId,
      trail: trailWithUsers
    });
  } catch (err) {
    console.error("Error getting audit trail:", err);
    req.flash('error_msg', 'Error loading audit trail');
    res.redirect('/audit/report');
  }
};

/**
 * GET /audit/red-flags
 * Display red flag alerts and violations
 */
export const listRedFlags = async (req, res) => {
  try {
    // Get failed actions
    const failures = await AuditLog.findAll({
      where: { status: 'failure' },
      order: [['created_at', 'DESC']],
      limit: 100
    });

    // Get failed actions by user in short timeframe
    const suspiciousActivity = await AuditLog.findAll({
      where: {
        created_at: {
          [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      order: [['created_at', 'DESC']]
    });

    // Group by user and count
    const suspiciousByUser = {};
    suspiciousActivity.forEach(log => {
      const userId = log.user_id || 'System';
      if (!suspiciousByUser[userId]) {
        suspiciousByUser[userId] = { count: 0, failures: 0 };
      }
      suspiciousByUser[userId].count++;
      if (log.status === 'failure') {
        suspiciousByUser[userId].failures++;
      }
    });

    // Flag high activity accounts (>50 actions in 24h)
    const redFlags = [];
    for (const [userId, data] of Object.entries(suspiciousByUser)) {
      if (data.count > 50 || data.failures > 5) {
        const user = userId !== 'System' ? await User.findByPk(parseInt(userId)) : null;
        redFlags.push({
          user_id: userId,
          user_name: user?.name || 'System',
          activity_count: data.count,
          failure_count: data.failures,
          severity: data.failures > 5 ? 'high' : 'medium'
        });
      }
    }

    const failuresWithUsers = await Promise.all(failures.map(async (log) => {
      const user = log.user_id ? await User.findByPk(log.user_id) : null;
      return {
        ...log.toJSON(),
        user_name: user?.name || 'System'
      };
    }));

    res.render("audit/red-flags", {
      title: "Red Flags & Alerts",
      red_flags: redFlags,
      recent_failures: failuresWithUsers
    });
  } catch (err) {
    console.error("Error listing red flags:", err);
    req.flash('error_msg', 'Error loading red flags');
    res.redirect('/audit/report');
  }
};

/**
 * GET /audit/compliance-report
 * Generate compliance and audit report
 */
export const generateComplianceReport = async (req, res) => {
  try {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();

    // Get all relevant logs
    const logs = await AuditLog.findAll({
      where: {
        created_at: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      order: [['created_at', 'ASC']]
    });

    // Get blockchain transactions
    const blockchainTx = await BlockchainTransaction.findAll({
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.between]: [startDate.getTime(), endDate.getTime()]
        }
      },
      order: [['timestamp', 'ASC']]
    });

    // Compliance metrics
    const metrics = {
      total_audit_logs: logs.length,
      total_blockchain_tx: blockchainTx.length,
      successful_actions: logs.filter(l => l.status === 'success').length,
      failed_actions: logs.filter(l => l.status === 'failure').length,
      confirmed_tx: blockchainTx.filter(t => t.status === 'confirmed').length,
      unconfirmed_tx: blockchainTx.filter(t => t.status === 'pending').length,
      invalid_tx: blockchainTx.filter(t => t.status === 'invalid').length,
      critical_actions_logged: logs.filter(l => ['create', 'update', 'delete', 'approve'].includes(l.action)).length,
      data_integrity: blockchainTx.length > 0 ? (
        (blockchainTx.filter(t => t.status === 'confirmed').length / blockchainTx.length * 100)
      ).toFixed(2) : 'N/A'
    };

    // Compliance checklist
    const compliance = {
      all_actions_logged: logs.length > 0,
      blockchain_transactions_recorded: blockchainTx.length > 0,
      failure_handling: logs.filter(l => l.status === 'failure').length > 0,
      change_tracking: logs.filter(l => l.changes_before && l.changes_after).length > 0,
      user_activity_tracked: logs.filter(l => l.user_id).length > 0
    };

    res.render("audit/compliance-report", {
      title: "Compliance & Audit Report",
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      metrics,
      compliance,
      logs_count: logs.length,
      blockchain_tx_count: blockchainTx.length
    });
  } catch (err) {
    console.error("Error generating compliance report:", err);
    req.flash('error_msg', 'Error generating compliance report');
    res.redirect('/audit/report');
  }
};

/**
 * GET /audit/document-tracking
 * Track document metadata and access history
 */
export const trackDocuments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 25;
    const offset = (page - 1) * limit;

    const { count, rows: documents } = await DocumentMetadata.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    const totalPages = Math.ceil(count / limit);

    const docsWithAccessLog = await Promise.all(documents.map(async (doc) => {
      const accessLogs = await AuditLog.findAll({
        where: {
          resource_type: 'DocumentMetadata',
          resource_id: doc.id,
          action: 'access'
        },
        order: [['created_at', 'DESC']],
        limit: 5
      });

      return {
        ...doc.toJSON(),
        access_count: doc.access_count,
        last_accessed: doc.last_accessed_at,
        recent_accesses: accessLogs.length
      };
    }));

    res.render("audit/document-tracking", {
      title: "Document Tracking & Access Log",
      documents: docsWithAccessLog,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_count: count,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });
  } catch (err) {
    console.error("Error tracking documents:", err);
    req.flash('error_msg', 'Error loading document tracking');
    res.redirect('/audit/report');
  }
};

/**
 * GET /audit/export-report
 * Export audit report
 */
export const exportAuditReport = async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();

    const logs = await AuditLog.findAll({
      where: {
        created_at: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      order: [['created_at', 'ASC']]
    });

    if (format === 'csv') {
      let csv = 'Timestamp,User,Action,Resource Type,Resource ID,Status,IP Address\n';
      logs.forEach(log => {
        csv += `"${log.created_at}","${log.user_id || 'System'}","${log.action}","${log.resource_type}",${log.resource_id},"${log.status}","${log.ip_address || 'N/A'}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-report-${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    } else {
      const data = {
        exported_at: new Date().toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        total_entries: logs.length,
        audit_logs: logs.map(log => ({
          ...log.toJSON(),
          changes_before: log.changes_before ? JSON.parse(JSON.stringify(log.changes_before)) : null,
          changes_after: log.changes_after ? JSON.parse(JSON.stringify(log.changes_after)) : null
        }))
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=audit-report-${new Date().toISOString().split('T')[0]}.json`);
      return res.send(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Error exporting audit report:", err);
    req.flash('error_msg', 'Error exporting report');
    res.redirect('/audit/report');
  }
};
