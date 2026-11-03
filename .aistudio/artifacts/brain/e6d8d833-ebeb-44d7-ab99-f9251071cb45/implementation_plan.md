# OWASP API Top 10 Security Architecture & Hardening Roadmap

> **The security process started from 3rd November 2026 by dev Md. Shahriar Himel <CSE SUST>**

Comprehensive security audit and progressive hardening architecture for all backend routes, controllers, database models, and middleware in Mess ERP against the OWASP API Top 10 standard.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> To eliminate any risk of AI hallucination, accidental breaking changes, or regressions in existing working functions (like meal calculations, market logs, or tenant isolation), the implementation is structured **Part-by-Part (Phased Execution)**. Each part is self-contained, testable, and verified via compilation before moving to the next.

- **Confirmed Decision 1**: Include the exact banner:
  > **"The security process started from 3rd November 2026."**  
  > **"Made by Shahriar Himel on 3rd November 2026"**  
  at the top of both this plan and the repository's permanent `SECURITY_AUDIT_OWASP.md` file.
- **Confirmed Decision 2**: Adopt a Phased 4-Part Execution Strategy to ensure zero system downtime, flawless tenant isolation, and strict verification.

---

## 1. Security Gate Audit Matrix

| Security Gate | Status | Vulnerability Analysis & Hardening Focus |
| :--- | :---: | :--- |
| **Gate 1: Zero Frontend Trust** | **PARTIAL PASS** | Verify that no mutating route trusts frontend flags (`isExtra`, `actsAsMember`). All permissions are evaluated purely from server session (`req.user`) and database records. |
| **Gate 2: 3-Way Access Diamond (WHO/WHAT/WHICH)** | **ACTION REQUIRED** | • **WHO (Identity):** Firebase JWT & session token validation.<br>• **WHAT (BFLA):** Server-side role hierarchy checks.<br>• **WHICH (BOLA / IDOR):** Strict multi-tenant verification (`resource.messId === currentMessId`) on all mutations.<br>• **BOPLA (Mass Assignment):** Strict Zod DTO allowlists rejecting unapproved schema properties. |
| **Gate 3: Stateful Business Flow Validation** | **PARTIAL PASS** | Multi-step state machine checks: Democracy ballots validated for `ACTIVE` status and deadline; cycle rollovers enforce lock states; bill settlements require active balances. |
| **Gate 4: Zero-Trust External API Consumption** | **PASS** | Firebase tokens cryptographically verified using Firebase Admin SDK; Google OAuth verified via Google tokeninfo endpoint. Webhook HMAC verification architecture documented. |
| **Gate 5: SSRF Protection on Outbound Requests** | **PASS** | Outbound requests strictly limited to hardcoded SaaS endpoints (`resend.com`, `brevo.com`, `googleapis.com`). Centralized `safeFetch` utility implemented with private CIDR blocklist. |

---

## 2. Phased Part-by-Part Execution Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASED SECURITY HARDENING ROADMAP                    │
├────────────────────────────────────────────────────────────────────────┤
│ PART 1: Repository Security Documentation & Strict DTO Allowlists      │
│ • Create `SECURITY_AUDIT_OWASP.md` with 3rd Nov 2026 Himel attribution │
│ • Create Zod DTO schemas for member, market, and deposit updates       │
├────────────────────────────────────────────────────────────────────────┤
│ PART 2: 3-Way Access Control & BOLA (Multi-Tenant IDOR) Defense        │
│ • Audit and enforce `messId === currentMessId` on all record mutations │
│ • Guard `PUT /members/:id` and `DELETE` endpoints against cross-mess   │
├────────────────────────────────────────────────────────────────────────┤
│ PART 3: Stateful Business Flow Enforcement                             │
│ • Lock ballot voting behind state & deadline gates                     │
│ • Enforce locked-cycle immutability for past month financial records   │
├────────────────────────────────────────────────────────────────────────┤
│ PART 4: Outbound SSRF Guard (`safeFetch`) & Final Verification         │
│ • Implement `safeFetch` with private IP/metadata blocklist             │
│ • Run full build compilation (`compile_applet`) and type checking      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Technical Tasks

### Part 1: Repository Documentation & Strict DTO Allowlists
1. **GitHub Security File (`SECURITY_AUDIT_OWASP.md`)**:
   - Create at the workspace root.
   - Header:
     ```markdown
     # OWASP API Security Audit & Hardening Specification
     The security process started from 3rd November 2026.
     Made by Shahriar Himel on 3rd November 2026.
     ```
   - Provide an in-depth breakdown of all 5 security gates, why each is essential for Mess ERP, and how the multi-tenant architecture (`RULE[AGENTS_md]`) is safeguarded.
2. **DTO Schemas (`src/schemas/apiValidationSchemas.ts`)**:
   - `MemberSelfUpdateSchema`: Allow only safe profile attributes (`nickname`, `phone`, `whatsapp`, `bloodGroup`, `occupation`, `photo`, `personalTheme`).
   - `AdminMemberUpdateSchema`: Explicitly block administrative escalation fields (`isPlatformOwner`, `isUltimateAdmin`).
   - `MarketEntryInputSchema`: Validate positive amounts, valid YYYY-MM-DD dates, and sanitized strings.

### Part 2: 3-Way Access Diamond & Multi-Tenant BOLA Hardening
1. In `server/routes.ts`:
   - `DELETE /api/markets/:id`: Confirm market entry exists in the current mess tenant and the actor has permission.
   - `DELETE /api/deposits/:id`: Confirm deposit exists in the current mess tenant.
   - `PUT /api/members/:id`: Validate target member belongs to the active mess and apply the DTO filter.
   - `DELETE /api/bills/:id`: Verify bill belongs to the active mess.

### Part 3: Stateful Business Flow Hardening
1. In `server/routes.ts`:
   - `POST /api/democracy/vote`: Verify ballot is `ACTIVE` and current time is before `deadline`.
   - Ensure finalized/locked monthly cycles completely block new regular meal mutations or raw transaction inserts.

### Part 4: Centralized SSRF Protection & Verification
1. In `server/securityService.ts`:
   - Implement `safeFetch(url, options)`:
     - Enforce `https:` only.
     - Block loopback and private IP blocks (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `::1`).
     - Block Google Cloud Metadata hostnames (`metadata.google.internal`).
2. Run `compile_applet` and `lint_applet` (`tsc --noEmit`) to verify zero errors across the entire codebase.

---

## 4. Verification and Safety Criteria

- **Zero Regression**: Existing meal counts, balance sheet calculations, market logs, and auto-transition features remain 100% operational.
- **Strict Multi-Tenant Isolation**: No mess can read or mutate another mess's records under any circumstance (`RULE[AGENTS_md]`).
- **Audit Verification**: All security events continue logging to `auditLogs` with user ID, role, IP, and timestamp.
