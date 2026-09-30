/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * draftSessionManager.ts
 * Manages temporary in-session form drafts using browser sessionStorage.
 *
 * Rules:
 * - Scoped strictly to (activeMessId + userId + formName) to guarantee multi-tenant and multi-user privacy.
 * - Resides purely in sessionStorage: automatically destroyed when the user closes their browser or tab.
 * - Does not touch or pollute the backend database.
 * - Retains entered inputs across modal open/close, navigation away to disable Safe Mode, or incidental reloads.
 */

export function getActiveMessId(): string {
  if (typeof window === "undefined") return "default";
  try {
    return localStorage.getItem("active_mess_id") || "default";
  } catch {
    return "default";
  }
}

export function getDraftKey(formName: string, messId?: string, userId?: string, subKey?: string): string {
  const cleanMessId = messId || getActiveMessId();
  const cleanUserId = userId || "currentUser";
  return `mess_erp_draft_${cleanMessId}_${cleanUserId}_${formName}${subKey ? `_${subKey}` : ""}`;
}

export function saveFormDraft<T = any>(formName: string, messId: string | undefined, userId: string | undefined, data: T, subKey?: string): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    const key = getDraftKey(formName, messId, userId, subKey);
    window.sessionStorage.setItem(key, JSON.stringify({
      data,
      savedAt: Date.now()
    }));
  } catch (err) {
    console.warn("[DraftManager] Failed to save draft to sessionStorage", err);
  }
}

export function getFormDraft<T = any>(formName: string, messId?: string, userId?: string, subKey?: string): T | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const key = getDraftKey(formName, messId, userId, subKey);
    const item = window.sessionStorage.getItem(key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    return parsed?.data ?? null;
  } catch (err) {
    console.warn("[DraftManager] Failed to read draft from sessionStorage", err);
    return null;
  }
}

export function clearFormDraft(formName: string, messId?: string, userId?: string, subKey?: string): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    const key = getDraftKey(formName, messId, userId, subKey);
    window.sessionStorage.removeItem(key);
  } catch (err) {
    console.warn("[DraftManager] Failed to clear draft", err);
  }
}

export function hasFormDraft(formName: string, messId?: string, userId?: string, subKey?: string): boolean {
  if (typeof window === "undefined" || !window.sessionStorage) return false;
  try {
    const key = getDraftKey(formName, messId, userId, subKey);
    return !!window.sessionStorage.getItem(key);
  } catch {
    return false;
  }
}

export function hasMeaningfulDraft(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  return Object.values(data).some(val => {
    if (typeof val === "string") return val.trim().length > 0;
    if (typeof val === "number") return val > 0;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object" && val !== null) return Object.keys(val).length > 0;
    return false;
  });
}
