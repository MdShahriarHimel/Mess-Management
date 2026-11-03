# Production API Security Architecture (OWASP API Top 10 Standard)

> **The security process started from 3rd November 2026 by dev Md. Shahriar Himel <CSE SUST>**

This document provides a comprehensive security specification and audit verification of all backend routes, controllers, database models, and middleware in this repository. It serves as an architectural blueprint for production readiness and security auditing.

---

## 1. Zero Frontend Trust

### Principle
Never rely on hidden UI buttons, client-side route guards, or client-supplied role claims. Every mutating (`POST`, `PUT`, `DELETE`) or administrative route must verify authentication, role permissions, and tenant context exclusively within server-side middleware.

### Implementation in Mess ERP
- **Authentication Gateway (`authMiddleware`)**:
  Every non-public API endpoint is protected by `authMiddleware` in `server/routes.ts`. It cryptographically validates Google Firebase ID tokens via the Firebase Admin SDK (`verifyIdToken`) or cryptographic session tokens verified against the active server session store (`data/active_sessions.json`).
- **Role Hierarchy Enforcement (`checkRole`)**:
  Administrative endpoints (e.g. member archiving, mess settings updates, rule definitions) strictly enforce authorized roles:
  `checkRole([UserRole.ADMIN, UserRole.SUPERUSER, UserRole.MANAGER])`
- **Zero Client Parameter Trust**:
  Client-supplied flags (such as `isExtra` or self-declared management privileges) are discarded or strictly evaluated against server-verified records.

---

## 2. 3-Way Access Control Diamond (WHO / WHAT / WHICH)

```
                     ┌──────────────────────────────────────────────┐
                     │              WHO (Authentication)            │
                     │ Cryptographically verified caller via JWT /  │
                     │ session token (req.user populated by server) │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │           WHAT (Function Authorization)      │
                     │ Checks role hierarchy against action:        │
                     │ ADMIN / SUPERUSER / MANAGER / MEMBER         │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │            WHICH (Object Authorization)      │
                     │ Strict Multi-Tenant & Resource Ownership:    │
                     │ resource.messId === req.currentMessId &&     │
                     │ (resource.memberId === req.user.id || auth)  │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │            STRICT DTO ALLOWLIST              │
                     │ Zod schemas strip unapproved properties:     │
                     │ blocks isPlatformOwner, role escalation, etc.│
                     └──────────────────────────────────────────────┘
```

### Prevention of BFLA (Broken Function Level Authorization)
- Mutating actions verify whether the caller's verified role grants execution rights for that specific endpoint before touching data.
- Standard members cannot alter administrative flags, assign global mess duties, or modify other users' sensitive profiles.

### Prevention of BOLA (Broken Object Level Authorization / IDOR)
- **Multi-Tenant Isolation Invariant (`RULE[AGENTS_md]`)**:
  Every business resource (members, meals, market entries, cash deposits, bills, democracy ballots) is scoped to exactly one mess tenant.
- When mutating or deleting a record by its identifier (`:id`), the server checks that the record exists within the caller's active mess (`currentMessId`). Attempting to manipulate an ID belonging to a different mess is rejected with `403 Forbidden` or `404 Not Found`.

### Prevention of BOPLA (Broken Object Property Level Authorization / Mass Assignment)
- Request payloads for member updates, market entries, and financial records are validated using strict schemas (`src/schemas/apiValidationSchemas.ts`).
- Any attempt to inject unapproved attributes (such as `role: "ADMIN"`, `isPlatformOwner: true`, `isUltimateAdmin: true`, or `permissions`) is rejected or stripped at the server layer.

---

## 3. Stateful Business Flow Validation

### Principle
For multi-step workflows, verify server-side state transitions in the database before executing downstream steps. Never allow actions on expired, closed, or illegitimate states.

### Implementation in Mess ERP
- **Monthly Cycle Transition Engine**:
  - Automatically initializes new month cycles at 12:00 AM on the 1st day of the new month.
  - Maintains previous cycle access until the 2:00 PM transition cutoff.
  - Automatically transitions all members and locks the previous cycle at 2:00 PM.
  - Finalized/locked cycles reject retroactive mutations unless explicitly unlocked by authorized administrators with audit trail logging.
- **Democracy Ballot & Voting Workflow**:
  - The voting endpoint (`POST /api/democracy/vote`) validates server-side that the target ballot is in `ACTIVE` status and that the current server timestamp has not exceeded the ballot `deadline`.
- **Duplicate Prevention & Database Idempotency**:
  - Database-level unique constraint (`CREATE UNIQUE INDEX idx_market_entries_unique_record ON market_entries (month_id, member_id, date, amount, description)`) physically prevents duplicate market logs at the PostgreSQL storage engine level.

---

## 4. Zero-Trust External API Consumption

### Principle
Cryptographically verify all external authentication tokens (JWT signature, `iss`, `aud`, `exp`) and webhook signatures before trusting external payloads.

### Implementation in Mess ERP
- **Firebase Auth JWT Verification**:
  Firebase ID tokens are verified using `adminAuth.verifyIdToken(token, true)`, verifying:
  1. Cryptographic signature with Google's public JWKS certificates.
  2. Issuer (`iss`) matches `https://securetoken.google.com/<project-id>`.
  3. Audience (`aud`) matches the configured Firebase project.
  4. Token is unexpired and unrevoked.
- **OAuth User Info Verification**:
  Google OAuth tokens are verified directly against Google's `oauth2/v3/userinfo` and `oauth2/tokeninfo` endpoints before establishing user identity.
- **Webhooks & External Integrations**:
  Any external service integration enforces cryptographic verification (e.g. HMAC-SHA256 signatures) before processing payloads.

---

## 5. SSRF Protection on Outbound Requests

### Principle
Never pass raw user-supplied URLs or hostnames to server-side HTTP clients (`fetch`, `axios`, `http`). Enforce strict protocol allowlists and block private, loopback, and cloud metadata IP ranges.

### Implementation in Mess ERP
- **Hardcoded SaaS Destinations**:
  All server-side outbound HTTP requests (`fetch`) are restricted to hardcoded, static API endpoints:
  - Resend Mail API: `https://api.resend.com/emails`
  - Brevo Mail API: `https://api.brevo.com/v3/smtp/email`
  - Google OAuth API: `https://oauth2.googleapis.com/...`
- **Centralized `safeFetch` Guard (`server/securityService.ts`)**:
  A centralized outbound request guard enforces:
  1. Only `https:` protocol allowed (no `file:`, `ftp:`, `gopher:`).
  2. Blocks private and loopback CIDR blocks:
     - `127.0.0.0/8` (Localhost)
     - `10.0.0.0/8` (Private Network)
     - `172.16.0.0/12` (Private Network)
     - `192.168.0.0/16` (Local Subnet)
     - `169.254.169.254` (Link-local / Cloud Metadata)
     - `::1` (IPv6 Loopback)
  3. Blocks Google Cloud and AWS metadata hostnames (`metadata.google.internal`).
- **File & Image Uploads**:
  Avatars and market receipt vouchers are uploaded directly as multipart form binaries to local/PostgreSQL persistent file storage rather than fetching arbitrary remote URLs.

---

## Summary of Verification & Audit Trail

| Control Area | Security Mechanism | Verification Method |
| :--- | :--- | :--- |
| **Authentication** | Cryptographic Firebase JWT + Server Session Store | `authMiddleware` |
| **Authorization** | Multi-Role RBAC + Hierarchy Checks | `checkRole`, `checkAdminPermission` |
| **Tenant Isolation** | Scoped `messId` context and SQL filters | Multi-tenant engine (`RULE[AGENTS_md]`) |
| **Data Integrity** | PostgreSQL Engine Unique Constraint | `idx_market_entries_unique_record` |
| **Input Validation** | Strict Zod DTO Allowlists | `apiValidationSchemas.ts` |
| **Outbound Requests**| Centralized SSRF IP Blocklist | `safeFetch` |
| **Audit Logging** | Tamper-evident activity logs | `auditLogsTable` |
