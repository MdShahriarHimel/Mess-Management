/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from "nodemailer";

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  portUsed?: number;
  error?: string;
}

/**
 * Sends an email using Gmail SMTP with strict timeouts and automatic dual-port fallback.
 * First tries Port 465 (SSL) with a 7-second timeout.
 * If Port 465 fails or times out, immediately tries Port 587 (STARTTLS) with a 7-second timeout.
 * This guarantees responses in seconds rather than hanging for minutes.
 */
export async function sendEmailWithFallback(options: SendMailOptions): Promise<SendMailResult> {
  const rawUser = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;

  const smtpUser = rawUser ? rawUser.trim() : "";
  // Google App Passwords often contain spaces (e.g. 'abcd efgh ijkl mnop'), strip them completely
  const smtpPass = rawPass ? rawPass.trim().replace(/\s+/g, "") : "";

  if (!smtpUser || !smtpPass) {
    console.warn("[EmailService] SMTP credentials not configured in environment variables.");
    return {
      success: false,
      error: "SMTP credentials (SMTP_USER / SMTP_PASS) are not configured."
    };
  }

  const fromAddress = `"${options.fromName || "Mess ERP Security"}" <${smtpUser}>`;

  // --- Attempt 1: Port 465 (SSL) ---
  try {
    const transporter465 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 7000,
      greetingTimeout: 7000,
      socketTimeout: 9000,
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter465.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });

    console.log(`[EmailService] Email sent successfully to ${options.to} via Port 465. MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      portUsed: 465
    };
  } catch (err465: any) {
    console.warn(`[EmailService] Port 465 failed (${err465.message}). Retrying immediately via Port 587 (STARTTLS)...`);

    // --- Attempt 2: Port 587 (STARTTLS) ---
    try {
      const transporter587 = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 7000,
        greetingTimeout: 7000,
        socketTimeout: 9000,
        tls: {
          rejectUnauthorized: false
        }
      });

      const info587 = await transporter587.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });

      console.log(`[EmailService] Email sent successfully to ${options.to} via Port 587 fallback. MessageId: ${info587.messageId}`);
      return {
        success: true,
        messageId: info587.messageId,
        portUsed: 587
      };
    } catch (err587: any) {
      console.error(`[EmailService] Failed to send email via both Port 465 and Port 587:`, {
        err465: err465.message,
        err587: err587.message
      });
      return {
        success: false,
        error: `Port 465: ${err465.message}; Port 587: ${err587.message}`
      };
    }
  }
}
