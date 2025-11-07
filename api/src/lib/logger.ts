/**
 * Security Logger
 * Comprehensive logging and monitoring service using Winston
 */

import winston from 'winston';
import { Request } from 'express';
import {
  createAuditLog,
  getFailedLoginAttempts,
  getFailedLoginAttemptsByIP,
  getPasswordResetRequestsByEmail,
  getPasswordResetRequestsByIP,
} from '../repos/auditLogRepo';
import type { SecurityEventType, SeverityLevel } from '../models/auditLog';

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'appointment-booking-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      ),
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json(),
    }),
    // Write security events to security.log
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'warn',
      format: winston.format.json(),
    }),
  ],
});

// Helper to extract IP address from request
export function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// Helper to get user agent
export function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Log and track security events
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  severity: SeverityLevel,
  details: {
    userId?: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    req?: Request;
  }
): Promise<void> {
  const ipAddress = details.ipAddress || (details.req ? getClientIP(details.req) : undefined);
  const userAgent = details.userAgent || (details.req ? getUserAgent(details.req) : undefined);

  // Log to Winston
  const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
  logger[logLevel](`Security Event: ${eventType}`, {
    eventType,
    severity,
    userId: details.userId,
    email: details.email,
    ipAddress,
    userAgent,
    ...details.metadata,
  });

  // Store in database
  try {
    await createAuditLog({
      eventType,
      severity,
      userId: details.userId,
      email: details.email,
      ipAddress,
      userAgent,
      details: details.metadata || {},
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error, eventType });
  }
}

/**
 * Track failed login attempt and detect suspicious behavior
 * Auto-locks account after 10 failed attempts in 24 hours
 */
export async function trackFailedLogin(
  email: string,
  req: Request,
  reason: string = 'Invalid credentials',
  userId?: string
): Promise<{ blocked: boolean; attemptsLeft?: number; accountLocked?: boolean }> {
  const ipAddress = getClientIP(req);
  const userAgent = getUserAgent(req);

  // Get recent failed attempts (15 min for rate limiting, 24 hours for lockout check)
  const [shortTermAttempts, longTermAttempts, ipAttempts] = await Promise.all([
    getFailedLoginAttempts(email, 15), // 15-minute window for immediate blocking
    getFailedLoginAttempts(email, 1440), // 24-hour window for account lockout
    getFailedLoginAttemptsByIP(ipAddress, 15),
  ]);

  const totalAttempts = shortTermAttempts + 1;
  const ipTotalAttempts = ipAttempts + 1;
  const dailyAttempts = longTermAttempts + 1;

  // Determine severity based on attempts
  let severity: SeverityLevel = 'low';
  if (totalAttempts >= 5 || ipTotalAttempts >= 10) {
    severity = 'critical';
  } else if (totalAttempts >= 3 || ipTotalAttempts >= 5) {
    severity = 'high';
  } else if (totalAttempts >= 2) {
    severity = 'medium';
  }

  // Log the failed attempt
  await logSecurityEvent('LOGIN_FAILED', severity, {
    email,
    ipAddress,
    userAgent,
    metadata: {
      reason,
      emailAttempts: totalAttempts,
      ipAttempts: ipTotalAttempts,
      dailyAttempts,
    },
  });

  // Check if account should be locked (10 failed attempts in 24 hours)
  if (userId && dailyAttempts >= 10) {
    const { lockAccount } = await import('../repos/userRepo');
    await lockAccount(userId, 'Account locked after 10 failed login attempts in 24 hours. Please reset your password to unlock.');

    await logSecurityEvent('ACCOUNT_LOCKED', 'critical', {
      userId,
      email,
      ipAddress,
      userAgent,
      metadata: {
        reason: 'Too many failed login attempts',
        attemptsIn24Hours: dailyAttempts,
      },
    });

    return { blocked: true, accountLocked: true };
  }

  // Check if should block temporarily
  const maxAttempts = 5;
  const blocked = totalAttempts >= maxAttempts || ipTotalAttempts >= 10;

  if (blocked) {
    await logSecurityEvent('LOGIN_BLOCKED', 'critical', {
      email,
      ipAddress,
      userAgent,
      metadata: {
        reason: 'Too many failed attempts',
        emailAttempts: totalAttempts,
        ipAttempts: ipTotalAttempts,
      },
    });

    return { blocked: true };
  }

  return {
    blocked: false,
    attemptsLeft: maxAttempts - totalAttempts,
  };
}

/**
 * Track successful login
 */
export async function trackSuccessfulLogin(
  userId: string,
  email: string,
  req: Request
): Promise<void> {
  await logSecurityEvent('LOGIN_SUCCESS', 'low', {
    userId,
    email,
    req,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track registration attempts
 */
export async function trackRegistration(
  success: boolean,
  email: string,
  req: Request,
  userId?: string,
  reason?: string
): Promise<void> {
  const eventType = success ? 'REGISTRATION_SUCCESS' : 'REGISTRATION_FAILED';
  const severity: SeverityLevel = success ? 'low' : 'medium';

  await logSecurityEvent(eventType, severity, {
    userId,
    email,
    req,
    metadata: {
      reason,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track password reset requests with rate limiting
 */
export async function trackPasswordResetRequest(
  email: string,
  req: Request,
  userExists: boolean
): Promise<{ blocked: boolean; reason?: string }> {
  const ipAddress = getClientIP(req);
  const userAgent = getUserAgent(req);

  // Get recent password reset attempts
  const [emailResets, ipResets] = await Promise.all([
    getPasswordResetRequestsByEmail(email, 60), // 1 hour window
    getPasswordResetRequestsByIP(ipAddress, 60),
  ]);

  const totalEmailResets = emailResets + 1;
  const totalIpResets = ipResets + 1;

  // Determine severity based on attempts
  let severity: SeverityLevel = 'low';
  if (totalEmailResets >= 3 || totalIpResets >= 5) {
    severity = 'critical';
  } else if (totalEmailResets >= 2 || totalIpResets >= 3) {
    severity = 'high';
  }

  // Log the password reset request
  await logSecurityEvent('PASSWORD_RESET_REQUESTED', severity, {
    email,
    ipAddress,
    userAgent,
    metadata: {
      userExists,
      emailResets: totalEmailResets,
      ipResets: totalIpResets,
      timestamp: new Date().toISOString(),
    },
  });

  // Check if should block
  const maxEmailResets = 3; // Max 3 requests per email per hour
  const maxIpResets = 5; // Max 5 requests per IP per hour
  const blocked = totalEmailResets > maxEmailResets || totalIpResets > maxIpResets;

  if (blocked) {
    const reason = totalEmailResets > maxEmailResets
      ? `Too many password reset requests for this email. Please try again in 1 hour.`
      : `Too many password reset requests from this location. Please try again in 1 hour.`;

    await logSecurityEvent('SUSPICIOUS_ACTIVITY', 'critical', {
      email,
      ipAddress,
      userAgent,
      metadata: {
        activity: 'Password reset flooding detected',
        emailResets: totalEmailResets,
        ipResets: totalIpResets,
        blocked: true,
      },
    });

    return { blocked: true, reason };
  }

  // Log suspicious activity at threshold
  if (totalEmailResets >= 2 || totalIpResets >= 3) {
    await logSecurityEvent('SUSPICIOUS_ACTIVITY', 'high', {
      email,
      ipAddress,
      userAgent,
      metadata: {
        activity: 'Multiple password reset requests',
        emailResets: totalEmailResets,
        ipResets: totalIpResets,
      },
    });
  }

  return { blocked: false };
}

/**
 * Track password reset completion
 */
export async function trackPasswordReset(
  success: boolean,
  userId?: string,
  email?: string,
  req?: Request,
  reason?: string
): Promise<void> {
  const eventType = success ? 'PASSWORD_RESET_SUCCESS' : 'PASSWORD_RESET_FAILED';
  const severity: SeverityLevel = success ? 'medium' : 'high';

  await logSecurityEvent(eventType, severity, {
    userId,
    email,
    req,
    metadata: {
      reason,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track suspicious activities
 */
export async function trackSuspiciousActivity(
  activity: string,
  req: Request,
  details?: Record<string, any>
): Promise<void> {
  await logSecurityEvent('SUSPICIOUS_ACTIVITY', 'high', {
    req,
    metadata: {
      activity,
      ...details,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track token validation failures
 */
export async function trackTokenValidationFailure(
  reason: string,
  req: Request,
  token?: string
): Promise<void> {
  await logSecurityEvent('TOKEN_VALIDATION_FAILED', 'medium', {
    req,
    metadata: {
      reason,
      tokenPreview: token ? `${token.substring(0, 20)}...` : undefined,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * General application logger
 */
export { logger };

/**
 * Log info message
 */
export function logInfo(message: string, meta?: Record<string, any>): void {
  logger.info(message, meta);
}

/**
 * Log warning message
 */
export function logWarning(message: string, meta?: Record<string, any>): void {
  logger.warn(message, meta);
}

/**
 * Log error message
 */
export function logError(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
  logger.error(message, {
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : error,
    ...meta,
  });
}
