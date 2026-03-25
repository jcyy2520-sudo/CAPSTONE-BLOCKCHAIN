/**
 * Audit Service
 * Logs all user actions for compliance and security
 */

import { AuditLog } from '../models/auditModel.js';
import BlockchainService from './blockchainService.js';

class AuditService {
  /**
   * Log an action
   */
  static async logAction(req, action, resourceType, resourceId, changesBefore = null, changesAfter = null) {
    try {
      const log = await AuditLog.create({
        user_id: req.session?.user?.id || null,
        action: action,
        resource_type: resourceType,
        resource_id: resourceId,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        changes_before: changesBefore,
        changes_after: changesAfter,
        status: 'success'
      });

      // Anchor to blockchain
      try {
        await BlockchainService.createTransaction(
          'admin_action',
          req.session?.user?.id || null,
          resourceType,
          resourceId,
          {
            action: action,
            changes_before: changesBefore,
            changes_after: changesAfter
          }
        );
      } catch (err) {
        console.warn('Could not anchor audit log to blockchain:', err.message);
      }

      return log;
    } catch (err) {
      console.error('Error logging action:', err);
      return null;
    }
  }

  /**
   * Log a failed action (authentication, authorization, etc.)
   */
  static async logFailure(req, action, resourceType, resourceId, errorMessage) {
    try {
      return await AuditLog.create({
        user_id: req.session?.user?.id || null,
        action: action,
        resource_type: resourceType,
        resource_id: resourceId,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        status: 'failure',
        error_message: errorMessage
      });
    } catch (err) {
      console.error('Error logging failure:', err);
      return null;
    }
  }

  /**
   * Get audit logs for a user
   */
  static async getUserLogs(userId, limit = 100) {
    return await AuditLog.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: limit
    });
  }

  /**
   * Get audit logs for a resource
   */
  static async getResourceLogs(resourceType, resourceId, limit = 100) {
    return await AuditLog.findAll({
      where: { resource_type: resourceType, resource_id: resourceId },
      order: [['created_at', 'DESC']],
      limit: limit
    });
  }

  /**
   * Get all failed login attempts
   */
  static async getFailedLogins(hoursBack = 24) {
    const sinceDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return await AuditLog.findAll({
      where: {
        action: 'login_failed',
        status: 'failure',
        created_at: { [Symbol.for('gte')]: sinceDate }
      },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Generate audit report
   */
  static async generateAuditReport(startDate, endDate) {
    const logs = await AuditLog.findAll({
      where: {
        created_at: {
          [Symbol.for('gte')]: startDate,
          [Symbol.for('lte')]: endDate
        }
      },
      order: [['created_at', 'DESC']]
    });

    const summary = {
      totalEvents: logs.length,
      successfulActions: logs.filter(l => l.status === 'success').length,
      failedActions: logs.filter(l => l.status === 'failure').length,
      uniqueUsers: new Set(logs.map(l => l.user_id)).size,
      actionBreakdown: {}
    };

    // Group by action
    logs.forEach(log => {
      if (!summary.actionBreakdown[log.action]) {
        summary.actionBreakdown[log.action] = 0;
      }
      summary.actionBreakdown[log.action]++;
    });

    return {
      summary,
      logs,
      reportGeneratedAt: new Date().toISOString()
    };
  }
}

export default AuditService;
