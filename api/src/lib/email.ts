/**
 * Email Service
 * Handles sending transactional emails for authentication flows
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@appointmentbooking.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

let transporter: Transporter | null = null;

/**
 * Initialize email transporter
 */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  // For development, use ethereal email or console logging
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Emails will be logged to console.');
    // Create a test account for development
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  } else {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  return transporter;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  fullName: string,
  resetToken: string
): Promise<void> {
  const transporter = getTransporter();
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: 'Reset Your Password - Appointment Booking',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .content {
            padding: 40px 30px;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${fullName},</p>
            <p>We received a request to reset your password for your Appointment Booking account. Click the button below to create a new password:</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>

            <div class="warning">
              <strong>⏱️ This link expires in 1 hour</strong>
            </div>

            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea; font-size: 14px;">${resetUrl}</p>

            <p style="margin-top: 30px; color: #666;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Appointment Booking System</p>
            <p>&copy; ${new Date().getFullYear()} Appointment Booking. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${fullName},

We received a request to reset your password for your Appointment Booking account.

Click this link to reset your password (expires in 1 hour):
${resetUrl}

If you didn't request a password reset, you can safely ignore this email.

This is an automated message from Appointment Booking System.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    // Log email for development
    if (!EMAIL_USER || !EMAIL_PASS) {
      console.log('📧 Password reset email (DEV MODE):');
      console.log(`To: ${email}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('---');
    } else {
      console.log(`✅ Password reset email sent to ${email}`);
    }
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send welcome email after registration
 */
export async function sendWelcomeEmail(email: string, fullName: string): Promise<void> {
  const transporter = getTransporter();

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: 'Welcome to Appointment Booking!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .content {
            padding: 40px 30px;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px;">Welcome! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${fullName},</p>
            <p>Thank you for creating an account with Appointment Booking! We're excited to have you on board.</p>
            <p>You can now:</p>
            <ul>
              <li>Schedule appointments with ease</li>
              <li>Manage your bookings</li>
              <li>Receive timely reminders</li>
              <li>Access your appointment history</li>
            </ul>
            <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
            <p style="margin-top: 30px;">Best regards,<br>The Appointment Booking Team</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Appointment Booking. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${fullName},

Thank you for creating an account with Appointment Booking! We're excited to have you on board.

You can now:
- Schedule appointments with ease
- Manage your bookings
- Receive timely reminders
- Access your appointment history

If you have any questions or need assistance, feel free to reach out to our support team.

Best regards,
The Appointment Booking Team
    `,
  };

  try {
    await transporter.sendMail(mailOptions);

    if (!EMAIL_USER || !EMAIL_PASS) {
      console.log(`📧 Welcome email (DEV MODE) to: ${email}`);
    } else {
      console.log(`✅ Welcome email sent to ${email}`);
    }
  } catch (error) {
    // Don't throw on welcome email failure - it's not critical
    console.error('❌ Error sending welcome email:', error);
  }
}

/**
 * Send email verification link
 */
export async function sendVerificationEmail(
  email: string,
  fullName: string,
  verificationToken: string
): Promise<void> {
  const transporter = getTransporter();
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: EMAIL_FROM,
    to: email,
    subject: 'Verify Your Email - Appointment Booking',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .content {
            padding: 40px 30px;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .info {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>Hi ${fullName},</p>
            <p>Thanks for signing up! Please verify your email address to complete your registration and unlock all features.</p>

            <div style="text-align: center;">
              <a href="${verifyUrl}" class="button">Verify Email Address</a>
            </div>

            <div class="info">
              <strong>⏱️ This link expires in 24 hours</strong>
            </div>

            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea; font-size: 14px;">${verifyUrl}</p>

            <p style="margin-top: 30px; color: #666;">If you didn't create an account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Appointment Booking System</p>
            <p>&copy; ${new Date().getFullYear()} Appointment Booking. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hi ${fullName},

Thanks for signing up! Please verify your email address to complete your registration.

Click this link to verify your email (expires in 24 hours):
${verifyUrl}

If you didn't create an account, you can safely ignore this email.

This is an automated message from Appointment Booking System.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);

    // Log email for development
    if (!EMAIL_USER || !EMAIL_PASS) {
      console.log('📧 Email verification (DEV MODE):');
      console.log(`To: ${email}`);
      console.log(`Verify URL: ${verifyUrl}`);
      console.log('---');
    } else {
      console.log(`✅ Verification email sent to ${email}`);
    }
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}
