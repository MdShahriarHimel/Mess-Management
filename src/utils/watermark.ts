/**
 * ============================================================================
 * MESS ERP - PROVENANCE WATERMARK & AUTHOR SIGNATURE MODULE
 * ============================================================================
 * 
 * Original Creator: Md. Shahriar Himel <mdshahriarhimel@gmail.com>
 * Project Signature: SIG-HIMEL-MESSEXP-2026-X799
 * Fingerprint: SHA256-MESS-ERP-MD-SHAHRIAR-HIMEL-2026-BD-PROPRIETARY
 * Copyright (c) 2026 Md. Shahriar Himel. All rights reserved.
 * 
 * Unauthorized cloning, distribution, or re-uploading under another name 
 * is strictly prohibited under international copyright law.
 * ============================================================================
 */

export interface AuthorSignatureInfo {
  readonly author: string;
  readonly email: string;
  readonly project: string;
  readonly signatureId: string;
  readonly fingerprint: string;
  readonly copyright: string;
  readonly license: string;
  readonly buildYear: number;
}

export const AUTHOR_WATERMARK: AuthorSignatureInfo = {
  author: "Md. Shahriar Himel",
  email: "mdshahriarhimel@gmail.com",
  project: "Mess ERP - Bengal Bachelor ERP Engine",
  signatureId: "SIG-HIMEL-MESSEXP-2026-X799",
  fingerprint: "SHA256-MESS-ERP-MD-SHAHRIAR-HIMEL-2026-BD-PROPRIETARY",
  copyright: "Copyright © 2026 Md. Shahriar Himel. All rights reserved.",
  license: "Proprietary - Unauthorized duplication or re-publishing prohibited",
  buildYear: 2026,
};

/**
 * Emits the cryptographic author watermark to the browser console on startup.
 */
export function logAuthorWatermark(): void {
  if (typeof window === "undefined") return;

  const styleBanner = "background: #090d16; color: #06b6d4; font-weight: bold; font-size: 11px; padding: 4px 10px; border-radius: 4px; border: 1px solid #0891b2;";
  const styleSub = "color: #94a3b8; font-size: 10px; padding-left: 2px;";

  console.log(
    `%c🛡️ Mess ERP | Author: ${AUTHOR_WATERMARK.author} [${AUTHOR_WATERMARK.signatureId}]`,
    styleBanner
  );
  console.log(
    `%c${AUTHOR_WATERMARK.copyright} • Contact: ${AUTHOR_WATERMARK.email}`,
    styleSub
  );
}
