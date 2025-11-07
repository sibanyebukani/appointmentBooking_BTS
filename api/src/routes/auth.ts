/**
 * Authentication Routes
 * Handles user registration, login, password reset, and token validation
 */

import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { badRequest } from '../lib/validate';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
  updatePassword,
  createPasswordResetToken,
  findPasswordResetToken,
  markTokenAsUsed,
  findUserByVerificationToken,
  setEmailVerificationToken,
  clearEmailVerificationToken,
  lockAccount,
} from '../repos/userRepo';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyAccessToken,
  verifyAccessTokenWithContext,
  createPasswordResetTokenData,
  createRefreshTokenData,
  validatePasswordStrength,
  extractTokenFromHeader,
} from '../lib/auth';
import { toUserProfile } from '../models/user';
import { sendPasswordResetEmail, sendWelcomeEmail, sendVerificationEmail } from '../lib/email';
import {
  createRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  rotateRefreshToken,
} from '../repos/refreshTokenRepo';
import {
  trackRegistration,
  trackFailedLogin,
  trackSuccessfulLogin,
  trackPasswordResetRequest,
  trackPasswordReset,
  trackTokenValidationFailure,
  trackSuspiciousActivity,
  logError,
  getClientIP,
  getUserAgent,
} from '../lib/logger';
import { validatePasswordNotBreached } from '../lib/passwordBreach';
import {
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  verificationLimiter,
  refreshLimiter,
} from '../middleware/rateLimit';

const router = Router();

/**
 * POST /v1/auth/register
 * Register a new user account
 */
router.post('/register', registrationLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, fullName, password } = req.body ?? {};


    // Validate required fields
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw badRequest('Email is required');
    }
    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      throw badRequest('Full name is required');
    }
    if (!password || typeof password !== 'string') {
      throw badRequest('Password is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw badRequest('Invalid email format');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      await trackRegistration(false, email, req, undefined, passwordValidation.errors.join(', '));
      const err = new Error(passwordValidation.errors.join(', ')) as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    // Check if password has been breached
    const breachValidation = await validatePasswordNotBreached(password);
    if (!breachValidation.valid) {
      await trackRegistration(false, email, req, undefined, breachValidation.error || 'Password found in breach database');
      const err = new Error(breachValidation.error || 'Password has been compromised in a data breach') as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      await trackRegistration(false, email, req, undefined, 'Email already exists');
      throw badRequest('An account with this email already exists');
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('base64url');
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hour expiry

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await createUser({
      email,
      fullName,
      password, // Not used, but required by interface
      passwordHash,
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry,
    });

    // Generate JWT access token with IP and User-Agent binding
    const token = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    });

    // Generate refresh token
    const refreshTokenData = createRefreshTokenData(
      user.id,
      getClientIP(req),
      getUserAgent(req)
    );
    await createRefreshToken({
      userId: refreshTokenData.userId,
      token: refreshTokenData.token,
      expiresAt: refreshTokenData.expiresAt,
      ipAddress: refreshTokenData.ipAddress,
      userAgent: refreshTokenData.userAgent,
    });

    // Track successful registration
    await trackRegistration(true, user.email, req, user.id);

    // Send verification email (non-blocking)
    sendVerificationEmail(user.email, user.fullName, verificationToken).catch(err => {
      logError('Failed to send verification email', err);
    });

    // Return user profile and tokens
    res.status(201).json({
      success: true,
      data: {
        user: toUserProfile(user),
        token,
        refreshToken: refreshTokenData.token,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body ?? {};


    // Validate required fields
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw badRequest('Email is required');
    }
    if (!password || typeof password !== 'string') {
      throw badRequest('Password is required');
    }

    // Find user by email
    const user = await findUserByEmail(email);
    if (!user) {
      const loginCheck = await trackFailedLogin(email, req, 'User not found');
      if (loginCheck.blocked) {
        const err = new Error('Too many failed login attempts. Please try again later.') as Error & { status?: number };
        err.status = 429;
        throw err;
      }
      throw badRequest('Invalid email or password');
    }

    // Check if account is locked
    if (user.locked) {
      const lockReason = user.lockReason || 'Account locked due to security concerns';
      await trackSuspiciousActivity('Login attempt on locked account', req, {
        userId: user.id,
        email: user.email,
        lockReason,
      });
      const err = new Error(`Account is locked. ${lockReason}`) as Error & { status?: number };
      err.status = 403;
      throw err;
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      const loginCheck = await trackFailedLogin(email, req, 'Invalid password');
      if (loginCheck.blocked) {
        const err = new Error('Too many failed login attempts. Please try again later.') as Error & { status?: number };
        err.status = 429;
        throw err;
      }
      throw badRequest('Invalid email or password');
    }

    // Track successful login
    await trackSuccessfulLogin(user.id, user.email, req);

    // Update last login timestamp (non-blocking)
    updateLastLogin(user.id).catch(err => {
      logError('Failed to update last login', err);
    });

    // Generate JWT access token with IP and User-Agent binding
    const token = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    });

    // Generate refresh token
    const refreshTokenData = createRefreshTokenData(
      user.id,
      getClientIP(req),
      getUserAgent(req)
    );
    await createRefreshToken({
      userId: refreshTokenData.userId,
      token: refreshTokenData.token,
      expiresAt: refreshTokenData.expiresAt,
      ipAddress: refreshTokenData.ipAddress,
      userAgent: refreshTokenData.userAgent,
    });

    // Return user profile and tokens
    res.json({
      success: true,
      data: {
        user: toUserProfile(user),
        token,
        refreshToken: refreshTokenData.token,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/auth/forgot-password
 * Request password reset token
 */
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body ?? {};

    // Validate required fields
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw badRequest('Email is required');
    }

    // Find user by email
    const user = await findUserByEmail(email);

    // Track password reset request with rate limiting
    const resetCheck = await trackPasswordResetRequest(email, req, !!user);

    // Check if blocked due to rate limiting
    if (resetCheck.blocked) {
      const err = new Error(resetCheck.reason || 'Too many password reset requests') as Error & { status?: number };
      err.status = 429;
      throw err;
    }

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate reset token
      const tokenData = createPasswordResetTokenData(user.id);

      // Save token to database
      await createPasswordResetToken({
        userId: tokenData.userId,
        token: tokenData.token,
        expiresAt: tokenData.expiresAt,
      });

      // Send password reset email
      await sendPasswordResetEmail(user.email, user.fullName, tokenData.token);
    }

    // Always return success message
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body ?? {};

    // Validate required fields
    if (!token || typeof token !== 'string') {
      throw badRequest('Reset token is required');
    }
    if (!password || typeof password !== 'string') {
      throw badRequest('New password is required');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      const err = new Error(passwordValidation.errors.join(', ')) as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    // Check if password has been breached
    const breachValidation = await validatePasswordNotBreached(password);
    if (!breachValidation.valid) {
      const err = new Error(breachValidation.error || 'Password has been compromised in a data breach') as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    // Find valid reset token
    const resetToken = await findPasswordResetToken(token);
    if (!resetToken) {
      await trackPasswordReset(false, undefined, undefined, req, 'Invalid or expired token');
      throw badRequest('Invalid or expired reset token');
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      await trackPasswordReset(false, resetToken.userId, undefined, req, 'Token expired');
      throw badRequest('Reset token has expired');
    }

    // Get user for logging
    const user = await findUserById(resetToken.userId);

    // Hash new password and update user
    const passwordHash = await hashPassword(password);
    await updatePassword(resetToken.userId, passwordHash);

    // Mark token as used
    await markTokenAsUsed(resetToken.id);

    // Track successful password reset
    await trackPasswordReset(true, resetToken.userId, user?.email, req);

    // Return success
    res.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /v1/auth/validate
 * Validate JWT token and return user profile
 */
router.get('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      await trackTokenValidationFailure('Missing authorization token', req);
      throw badRequest('Authorization token is required');
    }

    // Verify token with IP and User-Agent validation
    const currentIp = getClientIP(req);
    const currentUserAgent = getUserAgent(req);
    const verification = verifyAccessTokenWithContext(token, currentIp, currentUserAgent);

    if (!verification.valid || !verification.payload) {
      // Check if it's a session hijacking attempt
      if (verification.mismatch) {
        await trackSuspiciousActivity('Session hijacking attempt detected', req, {
          userId: verification.payload?.userId,
          email: verification.payload?.email,
          ipChanged: verification.mismatch.ipChanged,
          userAgentChanged: verification.mismatch.userAgentChanged,
          originalIp: verification.mismatch.originalIp,
          currentIp: verification.mismatch.currentIp,
          originalUserAgent: verification.mismatch.originalUserAgent,
          currentUserAgent: verification.mismatch.currentUserAgent,
        });
        const err = new Error('Session hijacking detected. Please log in again.') as Error & { status?: number };
        err.status = 401;
        throw err;
      }

      await trackTokenValidationFailure('Invalid or expired JWT', req, token);
      const err = new Error('Invalid or expired token') as Error & { status?: number };
      err.status = 401;
      throw err;
    }

    // Fetch user from database to ensure they still exist
    const user = await findUserById(verification.payload.userId);
    if (!user) {
      await trackTokenValidationFailure('User not found for token', req, token);
      const err = new Error('User not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    // Return user profile
    res.json({
      success: true,
      data: {
        user: toUserProfile(user),
        valid: true,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /v1/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      const err = new Error('Authentication required') as Error & { status?: number };
      err.status = 401;
      throw err;
    }

    // Verify token with IP and User-Agent validation
    const currentIp = getClientIP(req);
    const currentUserAgent = getUserAgent(req);
    const verification = verifyAccessTokenWithContext(token, currentIp, currentUserAgent);

    if (!verification.valid || !verification.payload) {
      // Check if it's a session hijacking attempt
      if (verification.mismatch) {
        await trackSuspiciousActivity('Session hijacking attempt detected', req, {
          userId: verification.payload?.userId,
          email: verification.payload?.email,
          ipChanged: verification.mismatch.ipChanged,
          userAgentChanged: verification.mismatch.userAgentChanged,
          originalIp: verification.mismatch.originalIp,
          currentIp: verification.mismatch.currentIp,
        });
        const err = new Error('Session hijacking detected. Please log in again.') as Error & { status?: number };
        err.status = 401;
        throw err;
      }

      const err = new Error('Invalid or expired token') as Error & { status?: number };
      err.status = 401;
      throw err;
    }

    // Fetch user from database
    const user = await findUserById(verification.payload.userId);
    if (!user) {
      const err = new Error('User not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    // Return user profile
    res.json({
      success: true,
      data: toUserProfile(user),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/auth/verify-email
 * Verify email address using token
 */
router.post('/verify-email', verificationLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body ?? {};

    // Validate token
    if (!token || typeof token !== 'string') {
      throw badRequest('Verification token is required');
    }

    // Find user by verification token
    const user = await findUserByVerificationToken(token);
    if (!user) {
      const err = new Error('Invalid or expired verification token') as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    // Clear verification token and mark email as verified
    await clearEmailVerificationToken(user.id);

    // Return success
    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        emailVerified: true,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/auth/resend-verification
 * Resend email verification link
 */
router.post('/resend-verification', verificationLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body ?? {};

    // Validate email
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw badRequest('Email is required');
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent',
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      const err = new Error('Email is already verified') as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('base64url');
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24);

    // Update user with new token
    await setEmailVerificationToken(user.id, verificationToken, verificationExpiry);

    // Send verification email
    await sendVerificationEmail(user.email, user.fullName, verificationToken);

    res.json({
      success: true,
      message: 'Verification email has been sent',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/auth/refresh
 * Get new access token using refresh token
 */
router.post('/refresh', refreshLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body ?? {};

    // Validate refresh token
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw badRequest('Refresh token is required');
    }

    // Find valid refresh token
    const storedToken = await findValidRefreshToken(refreshToken);
    if (!storedToken) {
      await trackSuspiciousActivity('Invalid refresh token used', req, { refreshToken: refreshToken.substring(0, 20) });
      const err = new Error('Invalid or expired refresh token') as Error & { status?: number };
      err.status = 401;
      throw err;
    }

    // Get user
    const user = await findUserById(storedToken.userId);
    if (!user) {
      const err = new Error('User not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    // Check if account is locked
    if (user.locked) {
      const err = new Error('Account is locked') as Error & { status?: number };
      err.status = 403;
      throw err;
    }

    // Generate new access token
    const token = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
    });

    // Rotate refresh token (revoke old, create new)
    const newRefreshTokenData = createRefreshTokenData(
      user.id,
      getClientIP(req),
      getUserAgent(req)
    );
    const newRefreshToken = await rotateRefreshToken(refreshToken, {
      userId: newRefreshTokenData.userId,
      token: newRefreshTokenData.token,
      expiresAt: newRefreshTokenData.expiresAt,
      ipAddress: newRefreshTokenData.ipAddress,
      userAgent: newRefreshTokenData.userAgent,
    });

    if (!newRefreshToken) {
      const err = new Error('Failed to rotate refresh token') as Error & { status?: number };
      err.status = 500;
      throw err;
    }

    // Return new tokens
    res.json({
      success: true,
      data: {
        token,
        refreshToken: newRefreshToken.token,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/auth/logout
 * Logout and revoke refresh token
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body ?? {};

    // Validate refresh token
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw badRequest('Refresh token is required');
    }

    // Revoke the refresh token
    await revokeRefreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/auth/logout-all
 * Logout from all devices (revoke all refresh tokens for user)
 */
router.post('/logout-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      const err = new Error('Authentication required') as Error & { status?: number };
      err.status = 401;
      throw err;
    }

    // Verify token
    const currentIp = getClientIP(req);
    const currentUserAgent = getUserAgent(req);
    const verification = verifyAccessTokenWithContext(token, currentIp, currentUserAgent);

    if (!verification.valid || !verification.payload) {
      const err = new Error('Invalid or expired token') as Error & { status?: number };
      err.status = 401;
      throw err;
    }

    // Revoke all refresh tokens for this user
    await revokeAllUserRefreshTokens(verification.payload.userId);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (e) {
    next(e);
  }
});

export { router };
