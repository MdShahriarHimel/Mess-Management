/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const TOKEN_HASH_KEY = "last_known_valid_token_hash";
const LOCAL_TOKEN_KEY = "mess_token";

/**
 * Computes a fast, non-cryptographic checksum hash for string tokens
 * to track token integrity without expensive asynchronous crypto.
 */
export function hashToken(token: string): string {
  if (!token) return "empty";
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `th_${Math.abs(hash)}_${token.length}`;
}

export interface TokenIntegrityResult {
  isValid: boolean;
  isUnchanged: boolean;
  shouldWrite: boolean;
  tokenHash: string;
}

/**
 * Validates the incoming authentication token against localStorage and
 * the last-known-valid token hash in sessionStorage.
 *
 * If the token is identical to the current localStorage value and matches
 * the last-known-valid hash, writing to storage is skipped to prevent
 * triggering unnecessary storage events and auth event loops.
 */
export function validateTokenIntegrity(newToken: string | null | undefined): TokenIntegrityResult {
  if (!newToken || typeof newToken !== "string" || newToken.trim().length === 0) {
    return {
      isValid: false,
      isUnchanged: false,
      shouldWrite: false,
      tokenHash: "empty"
    };
  }

  const currentLocalToken = localStorage.getItem(LOCAL_TOKEN_KEY);
  const lastKnownHash = sessionStorage.getItem(TOKEN_HASH_KEY);
  const newTokenHash = hashToken(newToken);

  // If local token and session hash both match the new token, it is completely unchanged
  if (currentLocalToken === newToken && lastKnownHash === newTokenHash) {
    return {
      isValid: true,
      isUnchanged: true,
      shouldWrite: false,
      tokenHash: newTokenHash
    };
  }

  // Token is changed or uninitialized in sessionStorage
  return {
    isValid: true,
    isUnchanged: false,
    shouldWrite: true,
    tokenHash: newTokenHash
  };
}

/**
 * Writes the token to localStorage and records the last-known-valid hash
 * only if the token has actually changed.
 * Returns true if a write was executed, or false if the write was skipped.
 */
export function setStoredTokenSafely(newToken: string | null | undefined): boolean {
  const integrity = validateTokenIntegrity(newToken);
  if (!integrity.isValid || !integrity.shouldWrite || !newToken) {
    return false;
  }

  try {
    localStorage.setItem(LOCAL_TOKEN_KEY, newToken);
    sessionStorage.setItem(TOKEN_HASH_KEY, integrity.tokenHash);
    return true;
  } catch (e) {
    console.error("[TokenIntegrity] Failed to write token to storage:", e);
    return false;
  }
}

/**
 * Clears stored tokens and reset token integrity hashes across storage scopes.
 */
export function clearStoredTokenSafely(): void {
  try {
    localStorage.removeItem(LOCAL_TOKEN_KEY);
    localStorage.removeItem("mess_token_expiry");
    localStorage.removeItem("mess_user");
    sessionStorage.removeItem(LOCAL_TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_HASH_KEY);
    sessionStorage.removeItem("mess_user");
  } catch (e) {
    console.error("[TokenIntegrity] Failed to clear token storage:", e);
  }
}
