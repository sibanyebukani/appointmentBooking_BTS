/**
 * Security Dashboard Routes
 * Provides monitoring and audit log access
 */

import { Router, Request, Response } from 'express';
import {
  getSecurityMetrics,
  getSuspiciousActivities,
  getUserAuditLogs,
  getAuditLogsByType,
  markAsResolved,
} from '../repos/auditLogRepo';
import { verifyAccessToken, verifyAccessTokenWithContext, extractTokenFromHeader } from '../lib/auth';
import { getClientIP, getUserAgent, trackSuspiciousActivity } from '../lib/logger';

const router = Router();

/**
 * Middleware to verify admin access
 */
async function requireAdmin(req: Request, res: Response, next: Function) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    // Verify token with IP and User-Agent validation
    const currentIp = getClientIP(req);
    const currentUserAgent = getUserAgent(req);
    const verification = verifyAccessTokenWithContext(token, currentIp, currentUserAgent);

    if (!verification.valid || !verification.payload) {
      // Check if it's a session hijacking attempt
      if (verification.mismatch) {
        await trackSuspiciousActivity('Session hijacking attempt on admin endpoint', req, {
          userId: verification.payload?.userId,
          email: verification.payload?.email,
          ipChanged: verification.mismatch.ipChanged,
          userAgentChanged: verification.mismatch.userAgentChanged,
          originalIp: verification.mismatch.originalIp,
          currentIp: verification.mismatch.currentIp,
        });
        return res.status(401).json({ error: 'Session hijacking detected. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    if (verification.payload.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Attach user info to request
    (req as any).user = verification.payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * GET /v1/security/metrics
 * Get security metrics dashboard
 */
router.get('/metrics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const metrics = await getSecurityMetrics(hours);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch security metrics' });
  }
});

/**
 * GET /v1/security/suspicious
 * Get suspicious activities
 */
router.get('/suspicious', requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activities = await getSuspiciousActivities(limit);

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suspicious activities' });
  }
});

/**
 * GET /v1/security/user/:userId
 * Get audit logs for a specific user
 */
router.get('/user/:userId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await getUserAuditLogs(userId, limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user audit logs' });
  }
});

/**
 * GET /v1/security/events/:eventType
 * Get audit logs by event type
 */
router.get('/events/:eventType', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { eventType } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await getAuditLogsByType(eventType as any, limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs by type' });
  }
});

/**
 * POST /v1/security/resolve/:logId
 * Mark a suspicious activity as resolved
 */
router.post('/resolve/:logId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    await markAsResolved(logId);

    res.json({
      success: true,
      message: 'Activity marked as resolved',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark activity as resolved' });
  }
});

export { router };
