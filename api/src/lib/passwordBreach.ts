/**
 * Password Breach Detection
 * Checks passwords against HaveIBeenPwned API using k-anonymity model
 */

import crypto from 'crypto';
import { logWarning, logError } from './logger';

/**
 * Hash password using SHA-1 (required by HaveIBeenPwned API)
 */
function sha1Hash(password: string): string {
  return crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
}

/**
 * Check if password has been exposed in a data breach
 * Uses HaveIBeenPwned API with k-anonymity (only sends first 5 chars of hash)
 *
 * @param password - Password to check
 * @returns Object with breach status and count
 */
export async function checkPasswordBreach(password: string): Promise<{
  breached: boolean;
  count: number;
  error?: string;
}> {
  try {
    // Hash the password using SHA-1
    const hash = sha1Hash(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Query HaveIBeenPwned API with the first 5 characters
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'Appointment-Booking-App',
        'Add-Padding': 'true', // Adds padding to prevent leaking information via response size
      },
    });

    if (!response.ok) {
      logError('HaveIBeenPwned API error', new Error(`Status: ${response.status}`));
      return {
        breached: false,
        count: 0,
        error: 'Unable to verify password breach status',
      };
    }

    const data = await response.text();

    // Parse the response to find matching hash suffix
    const lines = data.split('\n');
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix === suffix) {
        const count = parseInt(countStr.trim(), 10);
        logWarning('Password found in breach database', { count });
        return {
          breached: true,
          count,
        };
      }
    }

    // Password not found in breaches
    return {
      breached: false,
      count: 0,
    };
  } catch (error) {
    logError('Error checking password breach', error);
    return {
      breached: false,
      count: 0,
      error: 'Unable to verify password breach status',
    };
  }
}

/**
 * Validate password is not breached (with threshold)
 * Returns validation result with user-friendly message
 *
 * @param password - Password to check
 * @param threshold - Minimum breach count to reject (default: 1, reject any breach)
 */
export async function validatePasswordNotBreached(
  password: string,
  threshold: number = 1
): Promise<{
  valid: boolean;
  error?: string;
  breachCount?: number;
}> {
  const result = await checkPasswordBreach(password);

  if (result.error) {
    // If we can't check, allow the password but log the error
    return { valid: true };
  }

  if (result.breached && result.count >= threshold) {
    return {
      valid: false,
      error: `This password has been exposed in ${result.count.toLocaleString()} data breach${result.count > 1 ? 'es' : ''}. Please choose a different password.`,
      breachCount: result.count,
    };
  }

  return { valid: true };
}
