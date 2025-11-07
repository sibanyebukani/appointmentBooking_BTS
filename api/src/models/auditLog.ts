/**
 * Audit Log Model
 * Tracks security events and suspicious activities
 */

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_BLOCKED'
  | 'REGISTRATION_SUCCESS'
  | 'REGISTRATION_FAILED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_RESET_FAILED'
  | 'TOKEN_VALIDATION_FAILED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'ACCOUNT_LOCKED'
  | 'MULTIPLE_FAILED_ATTEMPTS';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLog {
  id: string;
  eventType: SecurityEventType;
  severity: SeverityLevel;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export interface CreateAuditLogInput {
  eventType: SecurityEventType;
  severity: SeverityLevel;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export interface SecurityMetrics {
  totalEvents: number;
  failedLogins: number;
  successfulLogins: number;
  passwordResets: number;
  suspiciousActivities: number;
  blockedAttempts: number;
  recentEvents: AuditLog[];
}
