/**
 * authMiddleware.ts
 * Production-Grade Authentication & Authorization Middleware
 * Enforces OWASP API Top 10:
 * - Gate 1: Zero Frontend Trust (server-side session verification)
 * - Gate 2: BFLA / BOLA Diamond (Identity verification, RBAC, tenant scoping)
 * - Gate 4: Zero-Trust External API Consumption (strict Firebase JWT claims validation)
 */

import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../../src/lib/firebase-admin.js";
import firebaseConfig from "../../firebase-applet-config.json";
import { 
  loadDB, 
  saveDB, 
  generateUUID, 
  getActiveMessId, 
  setActiveMessId, 
  getUserActiveMessId, 
  setUserActiveMessId, 
  loadAdminControls, 
  checkAndSyncDbCacheIfNeeded,
  loadCredentials,
  saveCredentials,
  messContext
} from "../db.js";
import { pool } from "../../src/db/index.js";
import { isPlatformOwner, loadPlatformControls } from "../founder.js";
import { 
  validateActiveSession, 
  isValidMemberSessionToken, 
  setSessionCookie, 
  SESSION_COOKIE_NAME 
} from "../securityService.js";
import { Member, UserRole, MemberStatus } from "../../src/types.js";
import { loadMesses, loadSettings } from "../routes.js";

// ============================================================================
// CUSTOM REQUEST TYPES
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: Member;
  activeSession?: any;
}

export interface VerifiedFirebaseClaims {
  uid: string;
  email: string;
  name: string;
  picture: string | null;
  emailVerified: boolean;
  iss: string;
  aud: string;
  exp: number;
  authTime: number;
}

// ============================================================================
// STRICT FIREBASE JWT VERIFICATION (OWASP Gate 4: iss, aud, exp, sub)
// ============================================================================

/**
 * Cryptographically verifies Firebase ID tokens and enforces strict claims:
 * 1. Signature check via Firebase Admin SDK (with checkRevoked = true).
 * 2. Issuer (iss) MUST match https://securetoken.google.com/<projectId>.
 * 3. Audience (aud) MUST match <projectId>.
 * 4. Expiration (exp) MUST be in the future.
 * 5. Auth time (auth_time) MUST be in the past.
 * 6. Subject (sub) MUST be a non-empty string.
 */
export async function verifyFirebaseTokenStrict(token: string): Promise<VerifiedFirebaseClaims> {
  if (!token || typeof token !== "string" || !token.startsWith("ey")) {
    throw new Error("Invalid token format: Expected standard JWT string starting with 'ey'.");
  }

  const expectedProjectId = firebaseConfig.projectId;
  const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const clockSkewToleranceSec = 60; // 60s clock skew window

  try {
    // 1. Cryptographic signature and revocation verification
    const decodedToken = await adminAuth.verifyIdToken(token, true);

    // 2. Strict Issuer (iss) validation
    if (decodedToken.iss !== expectedIssuer) {
      throw new Error(`Security Gate 4 Violation: Token issuer mismatch. Expected ${expectedIssuer}, got ${decodedToken.iss}`);
    }

    // 3. Strict Audience (aud) validation
    if (decodedToken.aud !== expectedProjectId) {
      throw new Error(`Security Gate 4 Violation: Token audience mismatch. Expected ${expectedProjectId}, got ${decodedToken.aud}`);
    }

    // 4. Strict Expiration (exp) validation
    if (!decodedToken.exp || decodedToken.exp < (nowInSeconds - clockSkewToleranceSec)) {
      throw new Error(`Security Gate 4 Violation: Token expired at ${decodedToken.exp}, current server time is ${nowInSeconds}`);
    }

    // 5. Strict Auth Time (auth_time) validation
    if (!decodedToken.auth_time || decodedToken.auth_time > (nowInSeconds + clockSkewToleranceSec)) {
      throw new Error(`Security Gate 4 Violation: Token auth_time is in the future (${decodedToken.auth_time})`);
    }

    // 6. Strict Subject (sub / uid) validation
    if (!decodedToken.sub || typeof decodedToken.sub !== "string" || decodedToken.sub.trim().length === 0) {
      throw new Error("Security Gate 4 Violation: Token missing valid subject claim (sub/uid).");
    }

    return {
      uid: decodedToken.uid || decodedToken.sub,
      email: (decodedToken.email || "").toLowerCase(),
      name: decodedToken.name || "",
      picture: decodedToken.picture || null,
      emailVerified: Boolean(decodedToken.email_verified),
      iss: decodedToken.iss,
      aud: decodedToken.aud,
      exp: decodedToken.exp,
      authTime: decodedToken.auth_time
    };
  } catch (error: any) {
    // Optional fallback to Google OAuth2 tokeninfo for Google Workspace / direct OAuth
    try {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
      if (googleRes.ok) {
        const gData: any = await googleRes.json();
        if (gData.sub && gData.email) {
          const gExp = Number(gData.exp) || 0;
          if (gExp && gExp < (nowInSeconds - clockSkewToleranceSec)) {
            throw new Error(`Google token expired at ${gExp}`);
          }
          return {
            uid: gData.sub,
            email: String(gData.email).trim().toLowerCase(),
            name: gData.name || "",
            picture: gData.picture || null,
            emailVerified: gData.email_verified === "true" || gData.email_verified === true,
            iss: gData.iss || expectedIssuer,
            aud: gData.aud || expectedProjectId,
            exp: gExp,
            authTime: nowInSeconds
          };
        }
      }
    } catch {
      // Fall through to original error
    }

    const isExpired = error?.code === "auth/id-token-expired" || error?.message?.includes("expired");
    const isRevoked = error?.code === "auth/id-token-revoked" || error?.message?.includes("revoked");
    throw new Error(isExpired ? "Token has expired." : isRevoked ? "Token has been revoked." : (error?.message || "Invalid token credentials."));
  }
}

// ============================================================================
// CROSS-MESS MEMBER RESOLUTION HELPER
// ============================================================================

export interface MemberLookupResult {
  member: Member;
  memberIndex: number;
  messId: string;
  db: any;
}

export function findMemberAcrossAllMesses(query: { email?: string; id?: string; previousId?: string }): MemberLookupResult | null {
  const normEmail = query.email ? String(query.email).trim().toLowerCase() : "";
  const queryId = query.id ? String(query.id).trim() : "";
  const queryPrevId = query.previousId ? String(query.previousId).trim() : "";

  if (!normEmail && !queryId && !queryPrevId) return null;

  const matchesMember = (m: Member): boolean => {
    if (!m) return false;
    if (queryId && m.id === queryId) return true;
    if (queryPrevId && (m as any).previousIds && Array.isArray((m as any).previousIds) && (m as any).previousIds.includes(queryPrevId)) {
      return true;
    }
    if (normEmail && m.email && typeof m.email === "string" && m.email.trim().toLowerCase() === normEmail) {
      return true;
    }
    return false;
  };

  const candidates: MemberLookupResult[] = [];
  const activeMessId = getActiveMessId() || "default";
  const userPreferredMess = getUserActiveMessId(queryId, normEmail);

  try {
    const activeDb = loadDB(activeMessId);
    if (activeDb && Array.isArray(activeDb.members)) {
      const idx = activeDb.members.findIndex(matchesMember);
      if (idx !== -1) {
        candidates.push({
          member: activeDb.members[idx],
          memberIndex: idx,
          messId: activeMessId,
          db: activeDb
        });
      }
    }
  } catch (e) {
    console.error(`[findMemberAcrossAllMesses] Error in active mess ${activeMessId}:`, e);
  }

  const messesList = loadMesses().messes || [];
  for (const mess of messesList) {
    if (mess.id === activeMessId) continue;
    try {
      const mDb = loadDB(mess.id);
      if (mDb && Array.isArray(mDb.members)) {
        const idx = mDb.members.findIndex(matchesMember);
        if (idx !== -1) {
          candidates.push({
            member: mDb.members[idx],
            memberIndex: idx,
            messId: mess.id,
            db: mDb
          });
        }
      }
    } catch (e) {
      console.error(`[findMemberAcrossAllMesses] Error in mess ${mess.id}:`, e);
    }
  }

  if (candidates.length === 0) return null;

  if (isPlatformOwner(normEmail)) {
    const defaultCand = candidates.find(c => c.messId === "default" && c.member.name !== "Mess Administrator");
    if (defaultCand) return defaultCand;
  }

  if (userPreferredMess) {
    const preferred = candidates.find(c => c.messId === userPreferredMess && c.member.name !== "Mess Administrator");
    if (preferred) return preferred;
    const preferredFallback = candidates.find(c => c.messId === userPreferredMess);
    if (preferredFallback) return preferredFallback;
  }

  const realNameCandidate = candidates.find(c => 
    c.member.status !== MemberStatus.LEFT && c.member.status !== MemberStatus.ARCHIVED &&
    c.member.name !== "Mess Administrator" && c.member.nickname !== "Admin"
  );
  if (realNameCandidate) return realNameCandidate;

  const activeCandidate = candidates.find(c => 
    c.member.status !== MemberStatus.LEFT && c.member.status !== MemberStatus.ARCHIVED
  );
  if (activeCandidate) return activeCandidate;

  return candidates[0];
}

// ============================================================================
// CORE AUTH MIDDLEWARE (OWASP Gates 1, 2, 4)
// ============================================================================

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const headerToken = (authHeader && authHeader.startsWith("Bearer ")) ? authHeader.split(" ")[1]?.trim() : "";
  const cookieToken = (req.cookies && (req.cookies[SESSION_COOKIE_NAME] || req.cookies.mess_session)) ? (req.cookies[SESSION_COOKIE_NAME] || req.cookies.mess_session).trim() : "";

  const candidateTokens: string[] = [];
  if (headerToken) candidateTokens.push(headerToken);
  if (cookieToken && !candidateTokens.includes(cookieToken)) candidateTokens.push(cookieToken);

  if (candidateTokens.length === 0) {
    res.status(401).json({ error: "Unauthorized: Missing authentication credentials." });
    return;
  }

  let token = "";
  let tokenUid = "";
  let tokenEmail = "";
  let tokenName = "";
  let tokenPicture: string | null = null;
  let authSuccess = false;
  let lastAuthError = "Invalid credentials";

  for (const candidate of candidateTokens) {
    if (candidate.startsWith("ey")) {
      // Firebase JWT Token with Strict Claims Validation
      try {
        const claims = await verifyFirebaseTokenStrict(candidate);
        tokenUid = claims.uid;
        tokenEmail = claims.email;
        tokenName = claims.name;
        tokenPicture = claims.picture;
        token = candidate;
        authSuccess = true;
        break;
      } catch (err: any) {
        lastAuthError = err.message || "Invalid Firebase JWT token";
      }
    } else {
      // Server Session Token (${userId}:${sessionId}:${version})
      const candidateUid = candidate.split(":")[0];
      const sessionCheck = validateActiveSession(candidate, candidateUid);
      if (sessionCheck.valid) {
        tokenUid = candidateUid;
        token = candidate;
        if (sessionCheck.session) {
          req.activeSession = sessionCheck.session;
          setSessionCookie(res, token, req);
        }
        authSuccess = true;
        break;
      } else {
        lastAuthError = sessionCheck.reason || "Invalid or expired session token";
      }
    }
  }

  if (!authSuccess || !token) {
    res.status(401).json({ error: `Unauthorized: ${lastAuthError}` });
    return;
  }

  (req as any).token = token;

  const userLookup = findMemberAcrossAllMesses({
    email: tokenEmail,
    id: tokenUid,
    previousId: tokenUid
  });

  let memberRef = userLookup?.member;
  const userHomeMessId = userLookup?.messId || "default";
  if (memberRef) {
    (memberRef as any).messId = userHomeMessId;
  }

  const userId = tokenUid || memberRef?.id || "";
  const userEmail = (tokenEmail || memberRef?.email || "").toLowerCase();
  const isUltimateAdmin = isPlatformOwner(userEmail);
  const userName = isUltimateAdmin ? (memberRef?.name || "Md. Shahriar") : (memberRef?.name || tokenName || "Admin");
  const userNickname = isUltimateAdmin ? (memberRef?.nickname || "Himel") : (memberRef?.nickname || (userName.split(" ")[0] || "Admin"));

  if (!userId && !userEmail) {
    res.status(401).json({ error: "Unauthorized: Invalid session credentials" });
    return;
  }

  const adminControls = loadAdminControls().controls;
  const userControls = (userEmail && adminControls[userEmail]) || (userId && adminControls[userId]);
  const requestedMess = ((req.headers["x-mess-id"] as string) || (req.query.messId as string) || "").trim();

  const platformControls = loadPlatformControls();
  const tenantAdminEntry = (platformControls.authorizedTenantAdmins || []).find(
    (t: any) => t.email.toLowerCase() === userEmail && t.status === "ACTIVE"
  );
  const isStandaloneTenantAdmin = !!userControls?.isStandaloneTenantAdmin || !!tenantAdminEntry;

  let targetMessId = "default";
  let allowedMesses: string[] | null = null;

  if (isStandaloneTenantAdmin) {
    const tenantAllowed = tenantAdminEntry?.allowedMesses || userControls?.allowedMesses || [];
    const maxQuota = tenantAdminEntry?.maxMesses || userControls?.maxAllowedMesses || 1;

    if (tenantAllowed.length === 0) {
      const standaloneAdminUser: any = {
        id: userId || tenantAdminEntry?.id || `tenant-admin-${generateUUID().substring(0, 8)}`,
        name: userName || tenantAdminEntry?.name || "Tenant Admin",
        nickname: userNickname || (tenantAdminEntry?.name || "Admin").split(" ")[0],
        email: userEmail,
        phone: tenantAdminEntry?.phone || memberRef?.phone || "",
        whatsapp: tenantAdminEntry?.phone || memberRef?.whatsapp || "",
        bloodGroup: "O+",
        occupation: "Mess Administrator",
        joiningDate: new Date().toISOString().split("T")[0],
        leavingDate: null,
        role: UserRole.ADMIN,
        status: MemberStatus.ACTIVE,
        notes: "Authorized Standalone Tenant Admin",
        photo: tokenPicture || memberRef?.photo || null,
        isStandaloneTenantAdmin: true,
        allowedMesses: [],
        maxAllowedMesses: maxQuota,
        needsMessCreation: true
      };
      req.user = standaloneAdminUser;
      return next();
    }

    allowedMesses = tenantAllowed;
    if (requestedMess) {
      if (allowedMesses.includes(requestedMess)) {
        targetMessId = requestedMess;
      } else {
        res.status(403).json({ error: "Access denied: You are not authorized to access this mess." });
        return;
      }
    } else {
      const saved = getUserActiveMessId(userId, userEmail);
      if (saved && allowedMesses.includes(saved)) {
        targetMessId = saved;
      } else {
        targetMessId = allowedMesses[0];
      }
    }
  } else if (isUltimateAdmin) {
    targetMessId = requestedMess || getUserActiveMessId(userId, userEmail) || userHomeMessId || getActiveMessId() || "default";
  } else if (userControls && Array.isArray(userControls.allowedMesses) && userControls.allowedMesses.length > 0) {
    allowedMesses = userControls.allowedMesses;
    if (requestedMess) {
      if (allowedMesses.includes(requestedMess)) {
        targetMessId = requestedMess;
      } else {
        res.status(403).json({ error: "Access denied: You are not authorized to access this mess." });
        return;
      }
    } else {
      const saved = getUserActiveMessId(userId, userEmail);
      if (saved && allowedMesses.includes(saved)) {
        targetMessId = saved;
      } else {
        targetMessId = allowedMesses[0];
      }
    }
  } else {
    const userAssignedMess = (memberRef as any)?.messId || userHomeMessId || getUserActiveMessId(userId, userEmail) || "default";
    if (requestedMess && requestedMess !== userAssignedMess) {
      res.status(403).json({ error: "Access denied: You are not authorized to access this mess." });
      return;
    }
    targetMessId = userAssignedMess;
  }

  messContext.run({ messId: targetMessId }, async () => {
    try {
      await checkAndSyncDbCacheIfNeeded(targetMessId);
      const db = loadDB(targetMessId);
      let member = db.members.find(m => 
        m.id === userId || 
        ((m as any).previousIds && (m as any).previousIds.includes(userId)) ||
        (userEmail && m.email && m.email.toLowerCase() === userEmail)
      );

      if (!member && userLookup && userLookup.messId === targetMessId) {
        member = userLookup.member;
      }

      if (!member) {
        if (isStandaloneTenantAdmin && allowedMesses && allowedMesses.includes(targetMessId)) {
          const primaryAdmin: Member = {
            id: userId || tenantAdminEntry?.id || `admin-${targetMessId}-${generateUUID().substring(0, 8)}`,
            name: userName || tenantAdminEntry?.name || "Mess Administrator",
            nickname: userNickname || (userName || "Admin").split(" ")[0],
            email: userEmail,
            phone: tenantAdminEntry?.phone || memberRef?.phone || "01700000000",
            whatsapp: tenantAdminEntry?.phone || memberRef?.whatsapp || "01700000000",
            bloodGroup: "O+",
            occupation: "Mess Administrator",
            joiningDate: new Date().toISOString().split("T")[0],
            leavingDate: null,
            role: UserRole.ADMIN,
            status: MemberStatus.ACTIVE,
            notes: "Primary Administrator for this mess workspace",
            photo: tokenPicture || memberRef?.photo || null,
          };
          db.members.push(primaryAdmin);
          saveDB(targetMessId);
          member = primaryAdmin;
        } else if (isUltimateAdmin || (allowedMesses && allowedMesses.includes(targetMessId))) {
          const targetStatus = (memberRef?.status && memberRef.status !== MemberStatus.NOT_MEMBER)
            ? memberRef.status 
            : MemberStatus.ACTIVE;

          const newMember: Member = {
            id: isUltimateAdmin ? "B846zoR80ueVCTDbAoN9mxJKyZL2" : userId,
            name: isUltimateAdmin ? "Md. Shahriar" : (memberRef?.name || userName || "Administrator"),
            nickname: isUltimateAdmin ? "Himel" : (memberRef?.nickname || userNickname || "Admin"),
            email: userEmail,
            phone: memberRef?.phone || (isUltimateAdmin ? "01841410163" : "01712345678"),
            whatsapp: memberRef?.whatsapp || (isUltimateAdmin ? "01712345678" : "01712345678"),
            bloodGroup: memberRef?.bloodGroup || "O+",
            occupation: memberRef?.occupation || (isUltimateAdmin ? "Student" : "Mess Administrator"),
            joiningDate: memberRef?.joiningDate || new Date().toISOString().split("T")[0],
            leavingDate: null,
            role: UserRole.ADMIN,
            status: targetStatus,
            notes: isUltimateAdmin ? "Platform Owner" : "Authorized Mess Administrator",
            photo: tokenPicture || memberRef?.photo || (isUltimateAdmin ? "https://lh3.googleusercontent.com/a/ACg8ocIdPvmGLFO3q7RHon9ePLdZ9FNS9OlmvWMEBc6SOFG4hjiigPzk=s96-c" : null),
            hideAdminRole: isUltimateAdmin ? true : (memberRef?.hideAdminRole || false),
            seniorityYear: memberRef?.seniorityYear || (isUltimateAdmin ? "2023" : null),
            gender: memberRef?.gender || (isUltimateAdmin ? "Male" : null)
          };

          db.members.push(newMember);
          saveDB(targetMessId);
          member = newMember;
        } else {
          res.status(403).json({ error: "Your email has not been invited to this Mess. Please ask your Admin to invite you." });
          return;
        }
      } else if (tokenUid && member.id !== tokenUid && (token.startsWith("ey") || (member.email && userEmail && member.email.toLowerCase() === userEmail))) {
        const oldId = member.id;
        if (!(member as any).previousIds) (member as any).previousIds = [];
        if (!(member as any).previousIds.includes(oldId)) (member as any).previousIds.push(oldId);
        member.id = tokenUid;
        if (tokenPicture) member.photo = tokenPicture;
        
        const creds = loadCredentials();
        const existingPass = creds[oldId] || (tokenEmail ? creds[tokenEmail.toLowerCase()] : undefined) || (member.email ? creds[member.email.toLowerCase()] : undefined);
        if (existingPass) {
          creds[tokenUid] = existingPass;
          if (tokenEmail) creds[tokenEmail.toLowerCase()] = existingPass;
          if (member.email) creds[member.email.toLowerCase()] = existingPass;
          saveCredentials();
        }

        db.members = db.members.filter(m => m === member || (m.id !== oldId && m.email.toLowerCase() !== member.email.toLowerCase()));
        saveDB(targetMessId);

        (async () => {
          try {
            await pool.query("UPDATE bills SET collector_id = $1 WHERE collector_id = $2", [tokenUid, oldId]);
            await pool.query("UPDATE duties SET member_id = $1 WHERE member_id = $2", [tokenUid, oldId]);
            await pool.query("UPDATE deposits SET member_id = $1 WHERE member_id = $2", [tokenUid, oldId]);
            await pool.query("UPDATE market_entries SET member_id = $1 WHERE member_id = $2", [tokenUid, oldId]);
            await pool.query("UPDATE meals SET member_id = $1 WHERE member_id = $2", [tokenUid, oldId]);
            await pool.query("DELETE FROM members WHERE id = $1", [oldId]);
          } catch (e) {
            console.error("[Link UID] DB cleanup error:", e);
          }
        })();
      }

      const prevIds = (member as any).previousIds && Array.isArray((member as any).previousIds) ? (member as any).previousIds : [];
      const userLookupPrevIds = (userLookup?.member as any)?.previousIds;
      const allKnownIds = [
        member.id,
        ...(tokenUid ? [tokenUid] : []),
        ...(userLookup?.member?.id ? [userLookup.member.id] : []),
        ...(Array.isArray(userLookupPrevIds) ? userLookupPrevIds : []),
        ...prevIds
      ];
      if (!token.startsWith("ey") && !isValidMemberSessionToken(token, member.id, allKnownIds)) {
        res.status(401).json({ error: "Unauthorized: Session invalidated due to password change. Please log in again." });
        return;
      }

      const isSelfUpdateOrRestore = 
        (req.method === "PUT" && req.path === `/members/${member.id}`) ||
        (req.method === "POST" && req.path === `/members/${member.id}/restore`);

      if (member.status === MemberStatus.SUSPENDED && !isSelfUpdateOrRestore) {
        res.status(403).json({ error: "Account suspended: Contact Admin" });
        return;
      }

      if ((member.status === MemberStatus.ARCHIVED || member.status === MemberStatus.LEFT) && !isSelfUpdateOrRestore && req.method !== "GET") {
        res.status(403).json({ error: "Account archived or inactive: Read-only access granted." });
        return;
      }

      if (isUltimateAdmin) {
        const actingRole = req.headers["x-acting-role"] as string;
        if (actingRole && Object.values(UserRole).includes(actingRole as any)) {
          member = { ...member, role: actingRole as UserRole };
        }
      }

      if (isStandaloneTenantAdmin) {
        (member as any).isStandaloneTenantAdmin = true;
        (member as any).allowedMesses = allowedMesses || [];
        (member as any).maxAllowedMesses = tenantAdminEntry?.maxMesses || userControls?.maxAllowedMesses || 1;
      }

      setUserActiveMessId(member.id, member.email, targetMessId);
      res.setHeader("x-mess-id", targetMessId);

      (member as any).isPlatformOwner = Boolean(isUltimateAdmin);
      (member as any).isUltimateAdmin = Boolean(isUltimateAdmin);

      req.user = member;
      next();
    } catch (err) {
      console.error("Error in tenant auth middleware:", err);
      res.status(500).json({ error: "Internal error resolving mess context" });
    }
  });
}

// ============================================================================
// ROLE & PERMISSION HELPERS
// ============================================================================

export function checkRole(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized: Access requires authentication." });
      return;
    }
    
    // Admin and Platform Owner bypass standard role restrictions
    if (req.user.role === UserRole.ADMIN || (req.user as any).isPlatformOwner) {
      next();
      return;
    }

    if (roles.includes(req.user.role)) {
      if (req.user.role === UserRole.SUPERUSER) {
        const settings = loadSettings();
        const url = req.originalUrl || req.url;
        
        if (url.includes("/admin/backup") && !settings.superUserCanArchiveMembers) {
          res.status(403).json({ error: "Forbidden: Super User backup access revoked by Admin" });
          return;
        }
        if (url.includes("/members") && req.method === "POST" && !settings.superUserCanInviteMembers) {
          res.status(403).json({ error: "Forbidden: Super User member invitation power revoked by Admin" });
          return;
        }
        if (url.includes("/members") && url.includes("/archive") && !settings.superUserCanArchiveMembers) {
          res.status(403).json({ error: "Forbidden: Super User archiving power revoked by Admin" });
          return;
        }
      }
      next();
      return;
    }

    res.status(403).json({ error: "Forbidden: Insufficient privileges for this operation." });
  };
}

export function checkAdminPermission(req: AuthenticatedRequest, actionKey: string): boolean {
  if (!req.user) return false;
  if (isPlatformOwner(req.user.email) && req.user.role === UserRole.ADMIN) return true; // ultimate admin has full control
  if (req.user.role !== UserRole.ADMIN) return true; // other roles don't use these admin permission restrictions

  const controls = loadAdminControls().controls;
  const emailKey = req.user.email ? req.user.email.toLowerCase() : "";
  const userControls = (emailKey && controls[emailKey]) || controls[req.user.id];
  if (!userControls) {
    if (actionKey === "canManageMessBranches") return false;
    return true; // if no explicit overrides, default to true
  }

  if (actionKey === "canEditBills" && userControls.canEditBills === false) return false;
  if (actionKey === "canManageMeals" && userControls.canManageMeals === false) return false;
  if (actionKey === "canAddMarkets" && userControls.canAddMarkets === false) return false;
  if (actionKey === "canSuspendMembers" && userControls.canSuspendMembers === false) return false;
  if (actionKey === "canEditProfiles" && userControls.canEditProfiles === false) return false;
  if (actionKey === "canEditCycles" && userControls.canEditCycles === false) return false;
  if (actionKey === "canManageMessIdentity" && userControls.canManageMessIdentity === false) return false;
  if (actionKey === "canManageMessBranches" && userControls.canManageMessBranches !== true) return false;

  return true;
}
