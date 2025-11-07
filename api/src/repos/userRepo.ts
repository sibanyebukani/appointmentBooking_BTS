/**
 * User Repository
 * Data access layer for user and password reset token operations
 */

import { getCollection, ObjectId } from '../db/mongo';
import type { User, UserRole, CreateUserInput, PasswordResetToken, CreatePasswordResetTokenInput } from '../models/user';

// MongoDB document types (with _id)
export type UserDoc = {
  _id: ObjectId;
  email: string;
  fullName: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
  lastLogin?: Date;
  role: UserRole;
  locked: boolean;
  lockReason?: string;
  lockedAt?: Date;
  // Profile fields
  phoneNumber?: string;
  phoneVerified?: boolean;
  bio?: string;
  avatarUrl?: string;
  timezone?: string;
  language?: string;
  // Business profile
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessHours?: Record<string, { open: string; close: string; closed?: boolean }>;
  // Notification preferences
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  marketingEmails?: boolean;
};

export type PasswordResetTokenDoc = {
  _id: ObjectId;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
};

// Convert MongoDB doc to API format
function userToApi(doc: UserDoc): User {
  const { _id, ...rest } = doc;
  return {
    id: _id.toHexString(),
    ...rest,
  };
}

function tokenToApi(doc: PasswordResetTokenDoc): PasswordResetToken {
  const { _id, ...rest } = doc;
  return {
    id: _id.toHexString(),
    ...rest,
  };
}

/**
 * Create a new user
 */
export async function createUser(
  input: CreateUserInput & {
    passwordHash: string;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;
  }
): Promise<User> {
  const col = getCollection<UserDoc>('users');

  const now = new Date();
  const doc: Omit<UserDoc, '_id'> = {
    email: input.email.toLowerCase().trim(),
    fullName: input.fullName.trim(),
    passwordHash: input.passwordHash,
    role: input.role || 'customer',
    emailVerified: false,
    emailVerificationToken: input.emailVerificationToken,
    emailVerificationExpiry: input.emailVerificationExpiry,
    locked: false,
    createdAt: now,
    updatedAt: now,
  };

  const result = await col.insertOne(doc as UserDoc);
  return userToApi({ _id: result.insertedId, ...doc });
}

/**
 * Find user by email (case-insensitive)
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const col = getCollection<UserDoc>('users');
  const doc = await col.findOne({ email: email.toLowerCase().trim() });
  return doc ? userToApi(doc) : null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const col = getCollection<UserDoc>('users');
  const _id = new ObjectId(id);
  const doc = await col.findOne({ _id });
  return doc ? userToApi(doc) : null;
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const col = getCollection<UserDoc>('users');
  const _id = new ObjectId(userId);
  await col.updateOne(
    { _id },
    {
      $set: {
        lastLogin: new Date(),
        updatedAt: new Date()
      }
    }
  );
}

/**
 * Update user's email verification status
 */
export async function markEmailVerified(userId: string): Promise<void> {
  const col = getCollection<UserDoc>('users');
  const _id = new ObjectId(userId);
  await col.updateOne(
    { _id },
    {
      $set: {
        emailVerified: true,
        updatedAt: new Date()
      }
    }
  );
}

/**
 * Update user's password
 */
export async function updatePassword(userId: string, newPasswordHash: string): Promise<void> {
  const col = getCollection<UserDoc>('users');
  const _id = new ObjectId(userId);
  await col.updateOne(
    { _id },
    {
      $set: {
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      }
    }
  );
}

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(input: CreatePasswordResetTokenInput): Promise<PasswordResetToken> {
  const col = getCollection<PasswordResetTokenDoc>('passwordResetTokens');

  const doc: Omit<PasswordResetTokenDoc, '_id'> = {
    userId: input.userId,
    token: input.token,
    expiresAt: input.expiresAt,
    used: false,
    createdAt: new Date(),
  };

  const result = await col.insertOne(doc as PasswordResetTokenDoc);
  return tokenToApi({ _id: result.insertedId, ...doc });
}

/**
 * Find password reset token by token string
 */
export async function findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  const col = getCollection<PasswordResetTokenDoc>('passwordResetTokens');
  const doc = await col.findOne({ token, used: false });
  return doc ? tokenToApi(doc) : null;
}

/**
 * Mark password reset token as used
 */
export async function markTokenAsUsed(tokenId: string): Promise<void> {
  const col = getCollection<PasswordResetTokenDoc>('passwordResetTokens');
  const _id = new ObjectId(tokenId);
  await col.updateOne({ _id }, { $set: { used: true } });
}

/**
 * Delete expired password reset tokens (cleanup)
 */
export async function deleteExpiredTokens(): Promise<number> {
  const col = getCollection<PasswordResetTokenDoc>('passwordResetTokens');
  const result = await col.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount;
}

/**
 * Find user by email verification token
 */
export async function findUserByVerificationToken(token: string): Promise<User | null> {
  const col = getCollection<UserDoc>('users');
  const doc = await col.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: { $gt: new Date() }
  });
  return doc ? userToApi(doc) : null;
}

/**
 * Set email verification token for user
 */
export async function setEmailVerificationToken(
  userId: string,
  token: string,
  expiresAt: Date
): Promise<void> {
  const col = getCollection<UserDoc>('users');
  const _id = new ObjectId(userId);
  await col.updateOne(
    { _id },
    {
      $set: {
        emailVerificationToken: token,
        emailVerificationExpiry: expiresAt,
        updatedAt: new Date()
      }
    }
  );
}

/**
 * Clear email verification token after successful verification
 */
export async function clearEmailVerificationToken(userId: string): Promise<void> {
  const col = getCollection<UserDoc>('users');
  const _id = new ObjectId(userId);
  await col.updateOne(
    { _id },
    {
      $set: {
        emailVerified: true,
        updatedAt: new Date()
      },
      $unset: {
        emailVerificationToken: '',
        emailVerificationExpiry: ''
      }
    }
  );
}

/**
 * Lock user account
 */
export async function lockAccount(userId: string, reason: string): Promise<void> {
  const col = getCollection<UserDoc>('users');
  const _id = new ObjectId(userId);
  await col.updateOne(
    { _id },
    {
      $set: {
        locked: true,
        lockReason: reason,
        lockedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );
}

/**
 * Unlock user account
 */
export async function unlockAccount(userId: string): Promise<void> {
  const col = getCollection<UserDoc>('users');
  const _id = new ObjectId(userId);
  await col.updateOne(
    { _id },
    {
      $set: {
        locked: false,
        updatedAt: new Date()
      },
      $unset: {
        lockReason: '',
        lockedAt: ''
      }
    }
  );
}

/**
 * Update user profile
 */
export async function updateProfile(userId: string, updates: Record<string, any>): Promise<User | null> {
  const col = getCollection<UserDoc>('users');
  const _id = new ObjectId(userId);

  // Remove fields that shouldn't be updated via profile
  const safeUpdates = { ...updates };
  delete safeUpdates.passwordHash;
  delete safeUpdates.email;
  delete safeUpdates.emailVerified;
  delete safeUpdates.role;
  delete safeUpdates.locked;
  delete safeUpdates.createdAt;
  delete safeUpdates._id;
  delete safeUpdates.id;

  const result = await col.findOneAndUpdate(
    { _id },
    {
      $set: {
        ...safeUpdates,
        updatedAt: new Date()
      }
    },
    { returnDocument: 'after' }
  );

  return result ? userToApi(result) : null;
}
