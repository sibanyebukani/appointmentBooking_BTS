/**
 * Authentication Utilities
 * Handles password hashing, JWT tokens, and secure token generation
 */

import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '15m'; // Short-lived access tokens
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-in-production';
const REFRESH_TOKEN_EXPIRES_DAYS = 7; // 7 days for refresh tokens

// JWT Payload structure
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Hash a plain text password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m',
    issuer: 'appointment-booking-api',
    audience: 'appointment-booking-web',
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'appointment-booking-api',
      audience: 'appointment-booking-web',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify JWT token with IP address and User-Agent validation
 * Returns validation result with details about mismatches
 */
export function verifyAccessTokenWithContext(
  token: string,
  currentIpAddress: string,
  currentUserAgent: string
): {
  valid: boolean;
  payload: JWTPayload | null;
  mismatch?: {
    ipChanged: boolean;
    userAgentChanged: boolean;
    originalIp?: string;
    currentIp?: string;
    originalUserAgent?: string;
    currentUserAgent?: string;
  };
} {
  const payload = verifyAccessToken(token);

  if (!payload) {
    return { valid: false, payload: null };
  }

  // If token doesn't have IP/UA data (legacy tokens), allow but flag
  if (!payload.ipAddress || !payload.userAgent) {
    return { valid: true, payload };
  }

  // Check for IP address mismatch
  const ipChanged = payload.ipAddress !== currentIpAddress;
  const userAgentChanged = payload.userAgent !== currentUserAgent;

  if (ipChanged || userAgentChanged) {
    return {
      valid: false,
      payload,
      mismatch: {
        ipChanged,
        userAgentChanged,
        originalIp: payload.ipAddress,
        currentIp: currentIpAddress,
        originalUserAgent: payload.userAgent,
        currentUserAgent,
      },
    };
  }

  return { valid: true, payload };
}

/**
 * Generate secure random token for password reset
 * Returns a URL-safe base64 token
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generate password reset token with expiry
 */
export function createPasswordResetTokenData(userId: string): {
  token: string;
  expiresAt: Date;
  userId: string;
} {
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

  return {
    token,
    expiresAt,
    userId,
  };
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

/**
 * Generate refresh token data with expiry
 */
export function createRefreshTokenData(userId: string, ipAddress?: string, userAgent?: string): {
  token: string;
  expiresAt: Date;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
} {
  const token = generateSecureToken(64); // Longer token for refresh tokens
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  return {
    token,
    expiresAt,
    userId,
    ipAddress,
    userAgent,
  };
}

/**
 * Verify refresh token signature (for JWT-based refresh tokens)
 * Note: In this implementation, we use database-stored tokens for better security
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}
