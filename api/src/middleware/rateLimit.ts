/**
 * Rate Limiting Middleware
 * Configures rate limits for different API endpoints
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API rate limiter
 * Allows 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again after 15 minutes',
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Allows 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts from this IP. Please try again after 15 minutes',
    });
  },
});

/**
 * Password reset rate limiter
 * Allows 3 requests per hour per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per windowMs
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many password reset requests',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many password reset requests from this IP. Please try again after 1 hour',
    });
  },
});

/**
 * Registration rate limiter
 * Allows 3 registrations per hour per IP
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per windowMs
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many registration attempts',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many registration attempts from this IP. Please try again after 1 hour',
    });
  },
});

/**
 * Email verification rate limiter
 * Allows 5 verification attempts per 15 minutes per IP
 */
export const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many verification attempts',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many verification attempts from this IP. Please try again after 15 minutes',
    });
  },
});

/**
 * Token refresh rate limiter
 * Allows 10 refreshes per 15 minutes per IP
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many token refresh attempts',
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many token refresh attempts from this IP. Please try again after 15 minutes',
    });
  },
});
