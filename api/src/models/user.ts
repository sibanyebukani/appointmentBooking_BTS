/**
 * User Model
 * Defines user data structure for authentication and profile management
 */

export interface User {
  id: string;
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
  // Business profile (for service providers)
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
}

export type UserRole = 'customer' | 'admin' | 'staff';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  lastLogin?: Date;
  role: UserRole;
  createdAt: Date;
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
}

export interface UpdateProfileInput {
  fullName?: string;
  phoneNumber?: string;
  bio?: string;
  avatarUrl?: string;
  timezone?: string;
  language?: string;
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessHours?: Record<string, { open: string; close: string; closed?: boolean }>;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  marketingEmails?: boolean;
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
  role?: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface CreatePasswordResetTokenInput {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateRefreshTokenInput {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Converts a User document to a UserProfile (removes sensitive data)
 */
export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin,
    role: user.role,
    createdAt: user.createdAt,
    // Profile fields
    phoneNumber: user.phoneNumber,
    phoneVerified: user.phoneVerified,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    language: user.language,
    // Business profile
    businessName: user.businessName,
    businessType: user.businessType,
    businessAddress: user.businessAddress,
    businessPhone: user.businessPhone,
    businessHours: user.businessHours,
    // Notification preferences
    emailNotifications: user.emailNotifications,
    smsNotifications: user.smsNotifications,
    pushNotifications: user.pushNotifications,
    marketingEmails: user.marketingEmails,
  };
}
