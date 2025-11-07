/**
 * Refresh Token Repository
 * Data access layer for refresh token operations
 */

import { getCollection, ObjectId } from '../db/mongo';
import type { RefreshToken, CreateRefreshTokenInput } from '../models/user';

// MongoDB document type (with _id)
export type RefreshTokenDoc = {
  _id: ObjectId;
  userId: string;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
};

// Convert MongoDB doc to API format
function tokenToApi(doc: RefreshTokenDoc): RefreshToken {
  const { _id, ...rest } = doc;
  return {
    id: _id.toHexString(),
    ...rest,
  };
}

/**
 * Create a new refresh token
 */
export async function createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshToken> {
  const collection = getCollection<RefreshTokenDoc>('refreshTokens');

  const doc: Omit<RefreshTokenDoc, '_id'> = {
    userId: input.userId,
    token: input.token,
    expiresAt: input.expiresAt,
    revoked: false,
    createdAt: new Date(),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  };

  const result = await collection.insertOne(doc as any);
  const created = await collection.findOne({ _id: result.insertedId });

  if (!created) {
    throw new Error('Failed to create refresh token');
  }

  return tokenToApi(created);
}

/**
 * Find a valid (non-revoked, non-expired) refresh token
 */
export async function findValidRefreshToken(token: string): Promise<RefreshToken | null> {
  const collection = getCollection<RefreshTokenDoc>('refreshTokens');

  const doc = await collection.findOne({
    token,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });

  return doc ? tokenToApi(doc) : null;
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  const collection = getCollection<RefreshTokenDoc>('refreshTokens');

  await collection.updateOne(
    { token },
    {
      $set: {
        revoked: true,
        revokedAt: new Date(),
      },
    }
  );
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  const collection = getCollection<RefreshTokenDoc>('refreshTokens');

  await collection.updateMany(
    { userId, revoked: false },
    {
      $set: {
        revoked: true,
        revokedAt: new Date(),
      },
    }
  );
}

/**
 * Get all active refresh tokens for a user
 */
export async function getUserActiveRefreshTokens(userId: string): Promise<RefreshToken[]> {
  const collection = getCollection<RefreshTokenDoc>('refreshTokens');

  const docs = await collection
    .find({
      userId,
      revoked: false,
      expiresAt: { $gt: new Date() },
    })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(tokenToApi);
}

/**
 * Clean up expired tokens (can be run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const collection = getCollection<RefreshTokenDoc>('refreshTokens');

  const result = await collection.deleteMany({
    expiresAt: { $lt: new Date() },
  });

  return result.deletedCount;
}

/**
 * Rotate refresh token (revoke old, create new)
 */
export async function rotateRefreshToken(
  oldToken: string,
  newTokenData: CreateRefreshTokenInput
): Promise<RefreshToken | null> {
  // First, verify old token exists and is valid
  const oldRefreshToken = await findValidRefreshToken(oldToken);
  if (!oldRefreshToken) {
    return null;
  }

  // Revoke the old token
  await revokeRefreshToken(oldToken);

  // Create new token
  const newRefreshToken = await createRefreshToken(newTokenData);

  return newRefreshToken;
}

/**
 * Revoke a specific refresh token by document ID for a given user
 */
export async function revokeRefreshTokenByIdForUser(tokenId: string, userId: string): Promise<boolean> {
  const collection = getCollection<RefreshTokenDoc>('refreshTokens');
  const _id = new ObjectId(tokenId);

  const result = await collection.updateOne(
    { _id, userId, revoked: false },
    {
      $set: {
        revoked: true,
        revokedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Revoke all refresh tokens for a user except those matching current context (IP + User-Agent)
 * If ipAddress or userAgent are missing, revokes all tokens for safety except none.
 */
export async function revokeAllUserRefreshTokensExcept(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<number> {
  const collection = getCollection<RefreshTokenDoc>('refreshTokens');

  const filter: any = {
    userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  };

  if (ipAddress && userAgent) {
    // Exclude current device/session by IP+UA match
    filter.$nor = [
      { ipAddress: ipAddress, userAgent: userAgent },
    ];
  }

  const result = await collection.updateMany(filter, {
    $set: {
      revoked: true,
      revokedAt: new Date(),
    },
  });

  return result.modifiedCount;
}
