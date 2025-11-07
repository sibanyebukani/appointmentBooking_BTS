/**
 * Audit Log Repository
 * Data access layer for security audit logs
 */

import { getCollection, ObjectId } from '../db/mongo';
import type { AuditLog, CreateAuditLogInput, SecurityEventType, SecurityMetrics } from '../models/auditLog';

export type AuditLogDoc = {
  _id: ObjectId;
  eventType: SecurityEventType;
  severity: string;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
};

function toApi(doc: AuditLogDoc): AuditLog {
  const { _id, ...rest } = doc;
  return {
    id: _id.toHexString(),
    ...rest,
  } as AuditLog;
}

/**
 * Create a new audit log entry
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  const col = getCollection<AuditLogDoc>('auditLogs');

  const doc: Omit<AuditLogDoc, '_id'> = {
    eventType: input.eventType,
    severity: input.severity,
    userId: input.userId,
    email: input.email,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    details: input.details || {},
    timestamp: new Date(),
    resolved: false,
  };

  const result = await col.insertOne(doc as AuditLogDoc);
  return toApi({ _id: result.insertedId, ...doc });
}

/**
 * Get failed login attempts for an email within time window
 */
export async function getFailedLoginAttempts(
  email: string,
  sinceMinutes: number = 15
): Promise<number> {
  const col = getCollection<AuditLogDoc>('auditLogs');
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

  const count = await col.countDocuments({
    eventType: 'LOGIN_FAILED',
    email: email.toLowerCase(),
    timestamp: { $gte: since },
  });

  return count;
}

/**
 * Get failed login attempts by IP address
 */
export async function getFailedLoginAttemptsByIP(
  ipAddress: string,
  sinceMinutes: number = 15
): Promise<number> {
  const col = getCollection<AuditLogDoc>('auditLogs');
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

  const count = await col.countDocuments({
    eventType: 'LOGIN_FAILED',
    ipAddress,
    timestamp: { $gte: since },
  });

  return count;
}

/**
 * Get password reset requests by email
 */
export async function getPasswordResetRequestsByEmail(
  email: string,
  sinceMinutes: number = 60
): Promise<number> {
  const col = getCollection<AuditLogDoc>('auditLogs');
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

  const count = await col.countDocuments({
    eventType: 'PASSWORD_RESET_REQUESTED',
    email: email.toLowerCase(),
    timestamp: { $gte: since },
  });

  return count;
}

/**
 * Get password reset requests by IP address
 */
export async function getPasswordResetRequestsByIP(
  ipAddress: string,
  sinceMinutes: number = 60
): Promise<number> {
  const col = getCollection<AuditLogDoc>('auditLogs');
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000);

  const count = await col.countDocuments({
    eventType: 'PASSWORD_RESET_REQUESTED',
    ipAddress,
    timestamp: { $gte: since },
  });

  return count;
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  const col = getCollection<AuditLogDoc>('auditLogs');

  const docs = await col
    .find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return docs.map(toApi);
}

/**
 * Get recent audit logs by event type
 */
export async function getAuditLogsByType(
  eventType: SecurityEventType,
  limit: number = 100
): Promise<AuditLog[]> {
  const col = getCollection<AuditLogDoc>('auditLogs');

  const docs = await col
    .find({ eventType })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return docs.map(toApi);
}

/**
 * Get suspicious activities (high/critical severity)
 */
export async function getSuspiciousActivities(limit: number = 50): Promise<AuditLog[]> {
  const col = getCollection<AuditLogDoc>('auditLogs');

  const docs = await col
    .find({
      severity: { $in: ['high', 'critical'] },
      resolved: false,
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();

  return docs.map(toApi);
}

/**
 * Mark suspicious activity as resolved
 */
export async function markAsResolved(logId: string): Promise<void> {
  const col = getCollection<AuditLogDoc>('auditLogs');
  const _id = new ObjectId(logId);

  await col.updateOne({ _id }, { $set: { resolved: true } });
}

/**
 * Get security metrics for dashboard
 */
export async function getSecurityMetrics(hours: number = 24): Promise<SecurityMetrics> {
  const col = getCollection<AuditLogDoc>('auditLogs');
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [
    totalEvents,
    failedLogins,
    successfulLogins,
    passwordResets,
    suspiciousActivities,
    blockedAttempts,
    recentDocs,
  ] = await Promise.all([
    col.countDocuments({ timestamp: { $gte: since } }),
    col.countDocuments({ eventType: 'LOGIN_FAILED', timestamp: { $gte: since } }),
    col.countDocuments({ eventType: 'LOGIN_SUCCESS', timestamp: { $gte: since } }),
    col.countDocuments({
      eventType: { $in: ['PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_SUCCESS'] },
      timestamp: { $gte: since },
    }),
    col.countDocuments({ eventType: 'SUSPICIOUS_ACTIVITY', timestamp: { $gte: since } }),
    col.countDocuments({ eventType: 'LOGIN_BLOCKED', timestamp: { $gte: since } }),
    col.find({ timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray(),
  ]);

  return {
    totalEvents,
    failedLogins,
    successfulLogins,
    passwordResets,
    suspiciousActivities,
    blockedAttempts,
    recentEvents: recentDocs.map(toApi),
  };
}

/**
 * Clean up old audit logs (optional maintenance)
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
  const col = getCollection<AuditLogDoc>('auditLogs');
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  const result = await col.deleteMany({
    timestamp: { $lt: cutoffDate },
    severity: { $nin: ['high', 'critical'] }, // Keep high-severity logs
  });

  return result.deletedCount;
}
