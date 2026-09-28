/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from "nodemailer";
import { db } from "../src/db/index.js";
import { persistentFiles } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

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
  portUsed?: number | string;
  error?: string;
}

interface SmtpConfig {
  user: string;
  pass: string;
  host: string;
  port?: number;
}

let cachedSmtpConfig: SmtpConfig | null = null;

async function getSmtpCredentials(): Promise<SmtpConfig> {
  // 1. Check all standard environment variable variations used in Render / hosting platforms
  const envUser = (
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME ||
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER ||
    ""
  ).trim();

  const envPass = (
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.GMAIL_PASS ||
    ""
  ).trim().replace(/\s+/g, "");

  const envHost = (
    process.env.SMTP_SERVER ||
    process.env.SMTP_HOST ||
    process.env.EMAIL_HOST ||
    ""
  ).trim();

  const envPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;

  if (envUser && envPass) {
    return { user: envUser, pass: envPass, host: envHost || "smtp.gmail.com", port: envPort };
  }

  // 2. Check memory cache
  if (cachedSmtpConfig && cachedSmtpConfig.user && cachedSmtpConfig.pass) {
    return cachedSmtpConfig;
  }

  // 3. Fallback to persistent_files in PostgreSQL (essential for Render / Cloud Run where .env is absent)
  try {
    if (db) {
      const rows = await db
        .select()
        .from(persistentFiles)
        .where(eq(persistentFiles.filename, "smtp_credentials.json"))
        .limit(1);
      
      if (rows && rows.length > 0 && rows[0]?.content) {
        const parsed = JSON.parse(rows[0].content);
        if (parsed.user && parsed.pass) {
          cachedSmtpConfig = {
            user: String(parsed.user).trim(),
            pass: String(parsed.pass).trim().replace(/\s+/g, ""),
            host: String(parsed.host || envHost || "smtp.gmail.com").trim(),
            port: parsed.port ? Number(parsed.port) : envPort
          };
          return cachedSmtpConfig;
        }
      }
    }
  } catch (err) {
    console.error("[EmailService] Error retrieving SMTP credentials from PostgreSQL:", err);
  }

  return { user: "", pass: "", host: "smtp.gmail.com" };
}

/**
 * Sends an email using Gmail SMTP or custom SMTP server with automatic multi-transport fallback.
 * Automatically tries Gmail service preset, then Port 587 (STARTTLS), then Port 465 (SSL).
 */
export async function sendEmailWithFallback(options: SendMailOptions): Promise<SendMailResult> {
  const { user: smtpUser, pass: smtpPass, host: smtpHost, port: customPort } = await getSmtpCredentials();

  if (!smtpUser || !smtpPass) {
    console.warn("[EmailService] SMTP credentials not configured in environment or database.");
    return {
      success: false,
      error: "SMTP credentials (SMTP_USER / SMTP_USERNAME and SMTP_PASS / SMTP_PASSWORD) are not configured."
    };
  }

  const fromAddress = `"${options.fromName || "Mess ERP Security"}" <${smtpUser}>`;

  // If a custom SMTP server is specified (e.g. Brevo, Sendgrid, Mailgun, cPanel):
  if (smtpHost && !smtpHost.includes("gmail.com")) {
    try {
      const customTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: customPort || 587,
        secure: customPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
      });
      const customInfo = await customTransporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });
      console.log(`[EmailService] Email sent successfully via custom SMTP (${smtpHost}): ${customInfo.messageId}`);
      return { success: true, messageId: customInfo.messageId, portUsed: customPort || 587 };
    } catch (customErr: any) {
      console.warn(`[EmailService] Custom SMTP (${smtpHost}) failed: ${customErr.message}. Attempting Gmail fallbacks...`);
    }
  }

  // --- Transport 1: Built-in Gmail Service Preset ---
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });

    console.log(`[EmailService] Email sent successfully to ${options.to} via Gmail service. MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      portUsed: "gmail-service"
    };
  } catch (errPreset: any) {
    console.warn(`[EmailService] Gmail service preset failed (${errPreset.message}). Trying explicit Port 587 (STARTTLS)...`);

    // --- Transport 2: Explicit Port 587 (STARTTLS) ---
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
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
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
      console.warn(`[EmailService] Port 587 failed (${err587.message}). Trying explicit Port 465 (SSL)...`);

      // --- Transport 3: Explicit Port 465 (SSL) ---
      try {
        const transporter465 = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: smtpUser,
            pass: smtpPass
          },
          connectionTimeout: 15000,
          greetingTimeout: 15000,
          socketTimeout: 20000,
          tls: {
            rejectUnauthorized: false
          }
        });

        const info465 = await transporter465.sendMail({
          from: fromAddress,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text
        });

        console.log(`[EmailService] Email sent successfully to ${options.to} via Port 465 fallback. MessageId: ${info465.messageId}`);
        return {
          success: true,
          messageId: info465.messageId,
          portUsed: 465
        };
      } catch (err465: any) {
        console.error(`[EmailService] All 3 SMTP delivery methods failed:`, {
          preset: errPreset.message,
          port587: err587.message,
          port465: err465.message
        });
        return {
          success: false,
          error: `Delivery failed: ${errPreset.message || err587.message || err465.message}`
        };
      }
    }
  }
}
