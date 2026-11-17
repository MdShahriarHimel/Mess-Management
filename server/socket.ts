/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { validateActiveSession, SESSION_COOKIE_NAME } from "./securityService.js";
import { getActiveMessId, getUserActiveMessId, loadAdminControls, waitForDbReady } from "./db.js";
import { isPlatformOwner, loadPlatformControls } from "./founder.js";
import { findMemberAcrossAllMesses, verifyFirebaseTokenStrict } from "./middleware/authMiddleware.js";
import { MemberStatus } from "../src/types.js";

let io: SocketIOServer | null = null;

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    if (key) cookies[key] = val;
  }
  return cookies;
}

function extractSocketToken(socket: Socket): string {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }
  const authHeader = socket.handshake.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookieHeader(socket.handshake.headers?.cookie);
  const cookieToken = cookies[SESSION_COOKIE_NAME] || cookies.mess_session;
  return cookieToken ? cookieToken.trim() : "";
}

async function resolveSocketIdentity(token: string): Promise<{ uid: string; email: string } | null> {
  if (!token) return null;
  if (token.startsWith("ey")) {
    try {
      const claims = await verifyFirebaseTokenStrict(token);
      return { uid: claims.uid, email: (claims.email || "").toLowerCase() };
    } catch {
      return null;
    }
  }
  const candidateUid = token.split(":")[0];
  const sessionCheck = validateActiveSession(token, candidateUid);
  if (sessionCheck.valid) {
    const lookup = findMemberAcrossAllMesses({ id: candidateUid, previousId: candidateUid });
    return {
      uid: candidateUid,
      email: (lookup?.member?.email || "").toLowerCase()
    };
  }
  const directMember = findMemberAcrossAllMesses({ id: token, previousId: token });
  if (directMember?.member && directMember.member.status !== MemberStatus.ARCHIVED) {
    return {
      uid: directMember.member.id,
      email: (directMember.member.email || "").toLowerCase()
    };
  }
  return null;
}

function authorizeMessRoom(identity: { uid: string; email: string }, requestedMessId?: string): string | null {
  const cleanRequested = (requestedMessId || "").trim();
  const lookup = findMemberAcrossAllMesses({
    email: identity.email,
    id: identity.uid,
    previousId: identity.uid
  });
  const userHomeMessId = lookup?.messId || "default";
  const userEmail = (identity.email || lookup?.member?.email || "").toLowerCase();
  const userId = identity.uid || lookup?.member?.id || "";

  if (!userId && !userEmail) return null;

  if (isPlatformOwner(userEmail)) {
    return cleanRequested || getUserActiveMessId(userId, userEmail) || userHomeMessId || getActiveMessId() || "default";
  }

  const adminControls = loadAdminControls().controls;
  const userControls = (userEmail && adminControls[userEmail]) || (userId && adminControls[userId]);
  const platformControls = loadPlatformControls();
  const tenantAdminEntry = (platformControls.authorizedTenantAdmins || []).find(
    (t: any) => t.email?.toLowerCase() === userEmail && t.status === "ACTIVE"
  );

  const allowedMesses: string[] | null =
    tenantAdminEntry?.allowedMesses ||
    (userControls && Array.isArray(userControls.allowedMesses) && userControls.allowedMesses.length > 0
      ? userControls.allowedMesses
      : null);

  if (allowedMesses && allowedMesses.length > 0) {
    if (cleanRequested) {
      return allowedMesses.includes(cleanRequested) ? cleanRequested : null;
    }
    const saved = getUserActiveMessId(userId, userEmail);
    return (saved && allowedMesses.includes(saved)) ? saved : allowedMesses[0];
  }

  if (cleanRequested && cleanRequested !== userHomeMessId) {
    return null;
  }
  return userHomeMessId;
}

function leaveAllMessRooms(socket: Socket) {
  for (const room of Array.from(socket.rooms)) {
    if (room.startsWith("mess:")) {
      socket.leave(room);
    }
  }
}

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", async (socket) => {
    try {
      await waitForDbReady();
      const token = extractSocketToken(socket);
      const identity = await resolveSocketIdentity(token);
      if (identity) {
        socket.data.identity = identity;
        const requestedMessId = typeof socket.handshake.auth?.messId === "string"
          ? socket.handshake.auth.messId
          : undefined;
        const authorizedMessId = authorizeMessRoom(identity, requestedMessId);
        if (authorizedMessId) {
          socket.join(`mess:${authorizedMessId}`);
          socket.data.messId = authorizedMessId;
        }
      }
    } catch (err) {
      console.warn("[SocketIO] Handshake verification error:", err);
    }

    socket.on("switch-mess-room", async (payload: { messId?: string; token?: string } | string) => {
      try {
        await waitForDbReady();
        const requestedMessId = typeof payload === "string" ? payload : payload?.messId;
        const overrideToken = typeof payload === "object" && payload?.token ? payload.token.trim() : "";
        let identity = socket.data.identity as { uid: string; email: string } | undefined;
        if (overrideToken) {
          const refreshed = await resolveSocketIdentity(overrideToken);
          if (refreshed) {
            identity = refreshed;
            socket.data.identity = refreshed;
          }
        }
        if (!identity) {
          const handshakeToken = extractSocketToken(socket);
          if (handshakeToken) {
            const resolved = await resolveSocketIdentity(handshakeToken);
            if (resolved) {
              identity = resolved;
              socket.data.identity = resolved;
            }
          }
        }
        if (!identity) {
          leaveAllMessRooms(socket);
          socket.data.messId = null;
          return;
        }
        const authorizedMessId = authorizeMessRoom(identity, requestedMessId);
        leaveAllMessRooms(socket);
        if (authorizedMessId) {
          socket.join(`mess:${authorizedMessId}`);
          socket.data.messId = authorizedMessId;
        } else {
          socket.data.messId = null;
        }
      } catch (err) {
        console.warn("[SocketIO] switch-mess-room error:", err);
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

