export function getAuthToken(currentUser?: { id?: string } | null): string {
  try {
    const sessionTok = sessionStorage.getItem("mess_token");
    if (sessionTok && sessionTok.trim().length > 0) return sessionTok.trim();
    const localTok = localStorage.getItem("mess_token");
    if (localTok && localTok.trim().length > 0) return localTok.trim();
  } catch (_) {}
  return currentUser?.id || "";
}

export function getAuthHeader(currentUser?: { id?: string } | null, extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken(currentUser);
  let activeMess = "default";
  try {
    activeMess = localStorage.getItem("active_mess_id") || "default";
  } catch (_) {}
  return {
    "Authorization": `Bearer ${token}`,
    "X-Mess-Id": activeMess,
    ...extraHeaders
  };
}
