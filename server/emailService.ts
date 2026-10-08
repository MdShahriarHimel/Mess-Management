/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from "nodemailer";
import dns from "dns";
import { db } from "../src/db/index.js";
import { persistentFiles } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import { writeAndPersistFile } from "./db.js";

function ipv4Lookup(hostname: string, options: any, callback: any) {
  return dns.lookup(hostname, { family: 4 }, callback);
}

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

export interface SmtpConfig {
  user: string;
  pass: string;
  host: string;
  port?: number;
  resendApiKey?: string;
  resendFromEmail?: string;
}

let cachedSmtpConfig: SmtpConfig | null = null;

export async function getSmtpCredentials(): Promise<SmtpConfig> {
  // 1. Check all standard environment variable variations used in Render / hosting platforms
  const envResendKey = (
    process.env.RESEND_API_KEY ||
    (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith("re_") ? process.env.SMTP_PASS : "") ||
    ""
  ).trim();

  const envResendFrom = (process.env.RESEND_FROM_EMAIL || "").trim();

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

  if (envResendKey || (envUser && envPass)) {
    return {
      user: envUser,
      pass: envPass,
      host: envHost || "smtp.gmail.com",
      port: envPort,
      resendApiKey: envResendKey,
      resendFromEmail: envResendFrom
    };
  }

  // 2. Check memory cache
  if (cachedSmtpConfig && (cachedSmtpConfig.resendApiKey || (cachedSmtpConfig.user && cachedSmtpConfig.pass))) {
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
        const storedResendKey = (
          parsed.resendApiKey ||
          (parsed.pass && String(parsed.pass).startsWith("re_") ? parsed.pass : "") ||
          (parsed.user && String(parsed.user).startsWith("re_") ? parsed.user : "") ||
          ""
        ).trim();

        if (storedResendKey || (parsed.user && parsed.pass)) {
          cachedSmtpConfig = {
            user: String(parsed.user || "").trim(),
            pass: String(parsed.pass || "").trim().replace(/\s+/g, ""),
            host: String(parsed.host || envHost || "smtp.gmail.com").trim(),
            port: parsed.port ? Number(parsed.port) : envPort,
            resendApiKey: storedResendKey,
            resendFromEmail: parsed.resendFromEmail ? String(parsed.resendFromEmail).trim() : envResendFrom
          };
          return cachedSmtpConfig;
        }
      }
    }
  } catch (err) {
    console.error("[EmailService] Error retrieving SMTP credentials from PostgreSQL:", err);
  }

  return { user: "", pass: "", host: "smtp.gmail.com", resendApiKey: "", resendFromEmail: "" };
}

export async function saveSmtpCredentials(config: SmtpConfig): Promise<void> {
  const existing = await getSmtpCredentials();
  cachedSmtpConfig = {
    user: (config.user !== undefined ? config.user : existing.user || "").trim(),
    pass: (config.pass !== undefined ? config.pass : existing.pass || "").trim().replace(/\s+/g, ""),
    host: (config.host || existing.host || "smtp.gmail.com").trim(),
    port: config.port || existing.port || 587,
    resendApiKey: (config.resendApiKey !== undefined ? config.resendApiKey : (existing.resendApiKey || "")).trim(),
    resendFromEmail: (config.resendFromEmail !== undefined ? config.resendFromEmail : (existing.resendFromEmail || "")).trim()
  };
  writeAndPersistFile("smtp_credentials.json", JSON.stringify(cachedSmtpConfig, null, 2));
}

/**
 * Sends an email using:
 * 1. Resend HTTPS API (Port 443 - zero block chance on Render/cloud hosts) if API key provided
 * 2. Brevo HTTPS API (Port 443) if Brevo API key provided
 * 3. Enforced IPv4 SMTP fallback (Port 587 STARTTLS, Port 465 SSL, Port 2525) to prevent Render IPv6 blackholing.
 */
export async function sendEmailWithFallback(options: SendMailOptions): Promise<SendMailResult> {
  const smtpConfig = await getSmtpCredentials();
  const { user: smtpUser, pass: smtpPass, host: smtpHost, port: customPort, resendApiKey, resendFromEmail } = smtpConfig;

  // --------------------------------------------------------------------------
  // PRIORITY 1: Resend HTTP/REST API (Port 443 HTTPS - Works 100% on Render free tier!)
  // --------------------------------------------------------------------------
  const resendKey = (
    process.env.RESEND_API_KEY || 
    resendApiKey ||
    (smtpPass && smtpPass.startsWith("re_") ? smtpPass : "") ||
    (smtpUser && smtpUser.startsWith("re_") ? smtpUser : "")
  ).trim();

  if (resendKey) {
    try {
      console.log(`[EmailService] Attempting delivery via Resend HTTPS API (Port 443)...`);
      const fromSender = resendFromEmail || (options.fromName 
        ? `${options.fromName} <onboarding@resend.dev>` 
        : "Mess ERP <onboarding@resend.dev>");

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromSender,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text
        })
      });

      const resData: any = await resendRes.json().catch(() => ({}));
      if (resendRes.ok && resData.id) {
        console.log(`[EmailService] Email sent successfully via Resend HTTPS API: ${resData.id}`);
        return { success: true, messageId: resData.id, portUsed: "https-443-resend" };
      } else {
        const errDetail = resData.message || resData.error || (typeof resData === "string" ? resData : JSON.stringify(resData));
        console.warn(`[EmailService] Resend API returned error status ${resendRes.status}:`, resData);
        // If Resend was explicitly provided or no other SMTP configured, return the direct Resend error
        if (!smtpUser || !smtpPass || !smtpPass.length || smtpPass.startsWith("re_")) {
          return {
            success: false,
            error: `Resend API Error (${resendRes.status}): ${errDetail}`
          };
        }
      }
    } catch (resendErr: any) {
      console.warn(`[EmailService] Resend API failed: ${resendErr.message}. Falling back to SMTP...`);
      if (!smtpUser || !smtpPass || smtpPass.startsWith("re_")) {
        return {
          success: false,
          error: `Resend HTTPS Request Failed: ${resendErr.message}`
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // PRIORITY 2: Brevo HTTP/REST API (Port 443 HTTPS)
  // --------------------------------------------------------------------------
  const brevoKey = process.env.BREVO_API_KEY || (smtpPass && smtpPass.startsWith("xkeysib-") ? smtpPass : "");
  if (brevoKey) {
    try {
      console.log(`[EmailService] Attempting delivery via Brevo HTTPS API (Port 443)...`);
      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender: { 
            name: options.fromName || "Mess ERP", 
            email: smtpUser.includes("@") ? smtpUser : "no-reply@brevo.com" 
          },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text
        })
      });

      const bData: any = await brevoRes.json().catch(() => ({}));
      if (brevoRes.ok && bData.messageId) {
        console.log(`[EmailService] Email sent successfully via Brevo HTTPS API: ${bData.messageId}`);
        return { success: true, messageId: bData.messageId, portUsed: "https-443-brevo" };
      }
    } catch (bErr: any) {
      console.warn(`[EmailService] Brevo API failed: ${bErr.message}`);
    }
  }

  if (!smtpUser || !smtpPass) {
    console.warn("[EmailService] SMTP credentials not configured in environment or database.");
    return {
      success: false,
      error: "SMTP credentials (Gmail User & App Password or Resend API Key) are not configured."
    };
  }

  const fromAddress = `"${options.fromName || "Mess ERP Security"}" <${smtpUser}>`;

  // --------------------------------------------------------------------------
  // PRIORITY 3: Custom SMTP server (e.g. cPanel, Mailgun, Brevo SMTP) with IPv4 forced
  // --------------------------------------------------------------------------
  if (smtpHost && !smtpHost.includes("gmail.com")) {
    try {
      const customTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: customPort || 587,
        secure: customPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        family: 4, // Enforce IPv4 to bypass Render container IPv6 drop
        lookup: ipv4Lookup,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000
      } as any);

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

  // --------------------------------------------------------------------------
  // PRIORITY 4: Gmail Port 587 with STARTTLS and IPv4 Enforced
  // --------------------------------------------------------------------------
  let lastErrorMsg = "";
  try {
    const transporter587 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      family: 4, // CRITICAL FOR RENDER: Forces IPv4 to avoid hanging on missing IPv6 routing
      lookup: ipv4Lookup,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    } as any);

    const info587 = await transporter587.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });

    console.log(`[EmailService] Email sent successfully to ${options.to} via Port 587 IPv4: ${info587.messageId}`);
    return {
      success: true,
      messageId: info587.messageId,
      portUsed: 587
    };
  } catch (err587: any) {
    lastErrorMsg = err587.message || String(err587);
    console.warn(`[EmailService] Port 587 (IPv4) failed (${lastErrorMsg}). Trying Port 465 (SSL IPv4)...`);
  }

  // --------------------------------------------------------------------------
  // PRIORITY 5: Gmail Port 465 with SSL and IPv4 Enforced
  // --------------------------------------------------------------------------
  try {
    const transporter465 = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      family: 4,
      lookup: ipv4Lookup,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false
      }
    } as any);

    const info465 = await transporter465.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });

    console.log(`[EmailService] Email sent successfully to ${options.to} via Port 465 IPv4: ${info465.messageId}`);
    return {
      success: true,
      messageId: info465.messageId,
      portUsed: 465
    };
  } catch (err465: any) {
    lastErrorMsg = err465.message || String(err465);
    console.warn(`[EmailService] Port 465 (IPv4) failed (${lastErrorMsg}). Trying Gmail Service Preset...`);
  }

  // --------------------------------------------------------------------------
  // PRIORITY 6: Gmail Service Preset
  // --------------------------------------------------------------------------
  try {
    const transporterPreset = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      family: 4,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000
    } as any);

    const infoPreset = await transporterPreset.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });

    console.log(`[EmailService] Email sent successfully via Gmail service preset: ${infoPreset.messageId}`);
    return {
      success: true,
      messageId: infoPreset.messageId,
      portUsed: "gmail-preset"
    };
  } catch (errPreset: any) {
    lastErrorMsg = errPreset.message || String(errPreset);
  }

  // Check if failure is due to cloud provider egress firewall blocking SMTP ports
  const isTimeout = lastErrorMsg.includes("ETIMEDOUT") || 
    lastErrorMsg.includes("timeout") || 
    lastErrorMsg.includes("ECONNREFUSED") ||
    lastErrorMsg.includes("Connection timed out");

  if (isTimeout) {
    return {
      success: false,
      error: "রেন্ডার (Render) তাদের ফ্রি/স্টার্টার সার্ভারে সরাসরি আউটবাউন্ড SMTP পোর্ট (২৫, ৪৬৫, ৫৮৭) ব্লক বা ফিল্টার করে রাখে। সমাধান: জিমেইলের বদলে বিনামূল্যে Resend API Key (re_...) ব্যবহার করুন (resend.com থেকে ৫ সেকেন্ডে ফ্রি পাওয়া যায়), যা পোর্ট ৪৪৩ (HTTPS) দিয়ে চলে এবং রেন্ডারে কখনোই আটকে থাকে না।"
    };
  }

  return {
    success: false,
    error: `Delivery failed: ${lastErrorMsg}`
  };
}
