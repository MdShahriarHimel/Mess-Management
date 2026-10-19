/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { Request } from "express";

export interface RequestContext {
  req: Request;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Extracts client metadata (IP address, user agent, user role, mess scope)
 * from the active async request context.
 */
export function getClientMetadata(): {
  ip: string;
  userAgent: string;
  userRole?: string;
  messId?: string;
} {
  const store = requestContext.getStore();
  if (!store || !store.req) {
    return {
      ip: "127.0.0.1",
      userAgent: "Direct System Service",
      userRole: undefined,
      messId: undefined,
    };
  }

  const req = store.req;
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = typeof forwarded === "string" 
    ? forwarded.split(",")[0].trim() 
    : (Array.isArray(forwarded) ? forwarded[0] : null);
  const realIp = (req.headers["x-real-ip"] as string) || null;
  const socketIp = req.socket?.remoteAddress || null;
  const reqIp = req.ip || null;

  let resolvedIp = forwardedIp || realIp || socketIp || reqIp || "127.0.0.1";
  if (resolvedIp.startsWith("::ffff:")) {
    resolvedIp = resolvedIp.substring(7);
  }
  if (resolvedIp === "::1") {
    resolvedIp = "127.0.0.1";
  }

  const userAgent = (req.headers["user-agent"] as string) || "Mozilla/5.0 (Client)";
  const user = (req as any).user;

  return {
    ip: resolvedIp,
    userAgent,
    userRole: user?.role,
    messId: user?.messId,
  };
}
