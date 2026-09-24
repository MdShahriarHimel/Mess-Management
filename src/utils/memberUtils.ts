import { Member } from "../types.js";

/**
 * Deduplicates a member array ensuring each member has a unique key constraint (Firebase Auth UID or mapped unique ID).
 * If there are colliding email strings, prefers the authentic Firebase Auth UID account over temporary/synthetic IDs.
 */
export function deduplicateMembersList(members: Member[]): Member[] {
  if (!Array.isArray(members)) return [];
  const seenIds = new Set<string>();
  const seenEmails = new Map<string, Member>();
  const result: Member[] = [];

  for (const m of members) {
    if (!m || !m.id) continue;

    // Strict unique key constraint by member ID
    if (seenIds.has(m.id)) continue;

    const emailKey = m.email ? m.email.trim().toLowerCase() : "";
    if (emailKey && seenEmails.has(emailKey)) {
      const existing = seenEmails.get(emailKey)!;
      // Prefer authentic Firebase Auth UID (typically length >= 26 alphanumeric, no prefix) over synthetic IDs (idx_, seed_, etc.)
      const isExistingFirebaseUid = existing.id.length >= 26 && !existing.id.startsWith("idx_") && !existing.id.startsWith("seed_");
      const isCurrentFirebaseUid = m.id.length >= 26 && !m.id.startsWith("idx_") && !m.id.startsWith("seed_");

      if (!isExistingFirebaseUid && isCurrentFirebaseUid) {
        // Swap existing with current
        const idx = result.indexOf(existing);
        if (idx !== -1) result[idx] = m;
        seenIds.delete(existing.id);
        seenIds.add(m.id);
        seenEmails.set(emailKey, m);
      } else if (existing.role !== "ADMIN" && m.role === "ADMIN") {
        // Prefer ADMIN role for same email
        const idx = result.indexOf(existing);
        if (idx !== -1) result[idx] = m;
        seenIds.delete(existing.id);
        seenIds.add(m.id);
        seenEmails.set(emailKey, m);
      }
      continue;
    }

    seenIds.add(m.id);
    if (emailKey) seenEmails.set(emailKey, m);
    result.push(m);
  }

  return result;
}

/**
 * Deterministically sorts members or settlements alphabetically by nickname (or name if nickname is absent).
 * Uses localeCompare with base sensitivity for uniform A-Z ordering across Bengali and English.
 */
export function sortMembersAlphabetically<T extends { nickname?: string; name?: string }>(list: T[]): T[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const nameA = (a.nickname || a.name || "").trim();
    const nameB = (b.nickname || b.name || "").trim();
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
  });
}

/**
 * Finds a member strictly matching by unique key constraint (id), with optional fallback only if ID is missing.
 */
export function findMemberByUniqueKey(members: Member[], targetId?: string | null, fallbackEmail?: string | null): Member | undefined {
  if (!Array.isArray(members)) return undefined;
  if (targetId) {
    const foundById = members.find(m => m.id === targetId);
    if (foundById) return foundById;
  }
  if (!targetId && fallbackEmail) {
    const norm = fallbackEmail.trim().toLowerCase();
    return members.find(m => m.email && m.email.trim().toLowerCase() === norm);
  }
  return undefined;
}
