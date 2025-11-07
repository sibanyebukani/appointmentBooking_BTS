/**
 * Profile Routes
 * Secure endpoints for managing user profiles
 */

import { Router, Request, Response, NextFunction } from 'express';
import { badRequest } from '../lib/validate';
import { findUserById, updateProfile } from '../repos/userRepo';
import {
  verifyAccessTokenWithContext,
  extractTokenFromHeader,
  hashPassword,
  verifyPassword,
} from '../lib/auth';
import { toUserProfile } from '../models/user';
import { getClientIP, getUserAgent, trackSuspiciousActivity, logError } from '../lib/logger';
import type { UpdateProfileInput } from '../models/user';

const router = Router();

/**
 * Middleware to verify authentication
 */
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
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
        await trackSuspiciousActivity('Session hijacking attempt on profile endpoint', req, {
          userId: verification.payload?.userId,
          email: verification.payload?.email,
          ipChanged: verification.mismatch.ipChanged,
          userAgentChanged: verification.mismatch.userAgentChanged,
        });
        const err = new Error('Session hijacking detected. Please log in again.') as Error & { status?: number };
        err.status = 401;
        throw err;
      }

      const err = new Error('Invalid or expired token') as Error & { status?: number };
      err.status = 401;
      throw err;
    }

    // Attach user info to request
    (req as any).user = verification.payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /v1/profile
 * Get current user's profile
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;

    // Fetch user from database
    const user = await findUserById(userId);
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
 * PUT /v1/profile
 * Update current user's profile
 */
router.put('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const updates: UpdateProfileInput = req.body || {};

    // Validate updates
    const allowedFields = [
      'fullName',
      'phoneNumber',
      'bio',
      'avatarUrl',
      'timezone',
      'language',
      'businessName',
      'businessType',
      'businessAddress',
      'businessPhone',
      'businessHours',
      'emailNotifications',
      'smsNotifications',
      'pushNotifications',
      'marketingEmails',
    ];

    const filteredUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = (updates as any)[field];
      }
    }

    // Validate fullName if provided
    if (filteredUpdates.fullName !== undefined) {
      if (typeof filteredUpdates.fullName !== 'string' || !filteredUpdates.fullName.trim()) {
        throw badRequest('Full name must be a non-empty string');
      }
      filteredUpdates.fullName = filteredUpdates.fullName.trim();
    }

    // Validate phoneNumber if provided
    if (filteredUpdates.phoneNumber !== undefined && filteredUpdates.phoneNumber !== null) {
      if (typeof filteredUpdates.phoneNumber !== 'string') {
        throw badRequest('Phone number must be a string');
      }
      // Basic phone validation (can be enhanced)
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (filteredUpdates.phoneNumber && !phoneRegex.test(filteredUpdates.phoneNumber)) {
        throw badRequest('Invalid phone number format');
      }
    }

    // Validate bio length if provided
    if (filteredUpdates.bio !== undefined && filteredUpdates.bio !== null) {
      if (typeof filteredUpdates.bio !== 'string') {
        throw badRequest('Bio must be a string');
      }
      if (filteredUpdates.bio.length > 500) {
        throw badRequest('Bio must be 500 characters or less');
      }
    }

    // Validate business hours if provided
    if (filteredUpdates.businessHours !== undefined) {
      if (typeof filteredUpdates.businessHours !== 'object' || filteredUpdates.businessHours === null) {
        throw badRequest('Business hours must be an object');
      }
    }

    // Update profile
    const updatedUser = await updateProfile(userId, filteredUpdates);
    if (!updatedUser) {
      const err = new Error('Failed to update profile') as Error & { status?: number };
      err.status = 500;
      throw err;
    }

    // Return updated profile
    res.json({
      success: true,
      data: toUserProfile(updatedUser),
      message: 'Profile updated successfully',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/profile/change-password
 * Change user password
 */
router.post('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const { currentPassword, newPassword } = req.body || {};

    // Validate required fields
    if (!currentPassword || typeof currentPassword !== 'string') {
      throw badRequest('Current password is required');
    }
    if (!newPassword || typeof newPassword !== 'string') {
      throw badRequest('New password is required');
    }

    // Get user
    const user = await findUserById(userId);
    if (!user) {
      const err = new Error('User not found') as Error & { status?: number };
      err.status = 404;
      throw err;
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      await trackSuspiciousActivity('Failed password change attempt', req, {
        userId: user.id,
        email: user.email,
      });
      throw badRequest('Current password is incorrect');
    }

    // Validate new password strength
    const { validatePasswordStrength } = await import('../lib/auth');
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      const err = new Error(passwordValidation.errors.join(', ')) as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    // Check if new password is breached
    const { validatePasswordNotBreached } = await import('../lib/passwordBreach');
    const breachValidation = await validatePasswordNotBreached(newPassword);
    if (!breachValidation.valid) {
      const err = new Error(breachValidation.error || 'Password has been compromised') as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const { updatePassword } = await import('../repos/userRepo');
    await updatePassword(userId, newPasswordHash);

    // Return success
    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /v1/profile/upload-avatar
 * Upload user avatar (placeholder endpoint)
 */
router.post('/upload-avatar', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;

    // In production: implement file upload handling (multer, S3, etc.)
    // For now, just accept avatarUrl from body
    const { avatarUrl } = req.body || {};

    if (!avatarUrl || typeof avatarUrl !== 'string') {
      throw badRequest('Avatar URL is required');
    }

    // Validate URL format
    try {
      new URL(avatarUrl);
    } catch {
      throw badRequest('Invalid avatar URL format');
    }

    // Update profile with new avatar
    const updatedUser = await updateProfile(userId, { avatarUrl });
    if (!updatedUser) {
      const err = new Error('Failed to update avatar') as Error & { status?: number };
      err.status = 500;
      throw err;
    }

    res.json({
      success: true,
      data: {
        avatarUrl: updatedUser.avatarUrl,
      },
      message: 'Avatar updated successfully',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /v1/profile/avatar
 * Remove user avatar
 */
router.delete('/avatar', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;

    // Remove avatar
    const updatedUser = await updateProfile(userId, { avatarUrl: null });
    if (!updatedUser) {
      const err = new Error('Failed to remove avatar') as Error & { status?: number };
      err.status = 500;
      throw err;
    }

    res.json({
      success: true,
      message: 'Avatar removed successfully',
    });
  } catch (e) {
    next(e);
  }
});

export { router };
