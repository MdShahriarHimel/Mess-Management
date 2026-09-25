import { BASE_URL, getAdminSession, getTenantHeaders, createTestMess, deleteTestMess } from "./helpers/auth.js";
import { generateSessionToken } from "../server/securityService.js";

export async function runAccessBoundaryTest(): Promise<boolean> {
  console.log("\n============================================================");
  console.log("TEST SUITE 4: MULTI-TENANT ACCESS BOUNDARY & PERMISSION ISOLATION");
  console.log("============================================================");

  const session = await getAdminSession();
  const messA = await createTestMess(session, "Boundary-Mess-A");
  const messB = await createTestMess(session, "Boundary-Mess-B");

  console.log(`[Setup] Created Mess A (${messA.id}) and Mess B (${messB.id})`);

  try {
    const headersA = getTenantHeaders(session, messA.id);
    const headersB = getTenantHeaders(session, messB.id);

    // 1. Add Charlie as a normal member in Mess A only
    const memberRes = await fetch(`${BASE_URL}/members`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        name: "Charlie Member",
        nickname: "Charlie",
        email: `charlie_${Date.now()}@mess-a.local`,
        phone: "01733333333",
        bloodGroup: "O+",
        occupation: "Student",
        role: "MEMBER"
      })
    });
    const memberData = await memberRes.json();
    const charlieId = memberData.member?.id;

    if (!charlieId) throw new Error("Failed to create Charlie in Mess A");
    console.log(`[Setup] Created Charlie in Mess A (id: ${charlieId})`);

    // Generate valid session token for Charlie
    const charlieToken = generateSessionToken(charlieId);
    const charlieHeadersForMessA = {
      "Authorization": `Bearer ${charlieToken}`,
      "Content-Type": "application/json",
      "x-mess-id": messA.id
    };
    const charlieHeadersForMessB = {
      "Authorization": `Bearer ${charlieToken}`,
      "Content-Type": "application/json",
      "x-mess-id": messB.id
    };

    // 2. Charlie accesses his own mess (Mess A)
    const accessOwnMessRes = await fetch(`${BASE_URL}/members`, { headers: charlieHeadersForMessA });
    if (!accessOwnMessRes.ok) {
      throw new Error(`Charlie could not access his own Mess A: ${accessOwnMessRes.status}`);
    }
    console.log("  ✓ Charlie successfully accessed his authorized Mess A (Status 200)");

    // 3. Charlie attempts unauthorized access to Mess B
    const accessForeignMessRes = await fetch(`${BASE_URL}/members`, { headers: charlieHeadersForMessB });
    if (accessForeignMessRes.status !== 403) {
      throw new Error(`SECURITY LEAK: Charlie accessed Mess B with status ${accessForeignMessRes.status} instead of 403 Forbidden!`);
    }
    const foreignError = await accessForeignMessRes.json();
    console.log(`  ✓ Unauthorized tenant access blocked with 403 Forbidden: "${foreignError.error}"`);

    // 4. Charlie attempts unauthorized write to Mess B
    const writeForeignMessRes = await fetch(`${BASE_URL}/notices`, {
      method: "POST",
      headers: charlieHeadersForMessB,
      body: JSON.stringify({
        title: "Malicious Notice",
        content: "Trying to post to foreign mess"
      })
    });
    if (writeForeignMessRes.status !== 403) {
      throw new Error(`SECURITY LEAK: Charlie was allowed to write to Mess B (status: ${writeForeignMessRes.status})`);
    }
    console.log("  ✓ Unauthorized tenant mutation blocked with 403 Forbidden");

    // 5. Verify Settings & Branding Isolation
    console.log("\n[Settings Isolation] Updating distinct configuration per mess...");
    await fetch(`${BASE_URL}/settings`, {
      method: "PUT",
      headers: headersA,
      body: JSON.stringify({
        messName: "Delta Elite Residence",
        logoText: "DELTA"
      })
    });

    await fetch(`${BASE_URL}/settings`, {
      method: "PUT",
      headers: headersB,
      body: JSON.stringify({
        messName: "Omega Premier Hostel",
        logoText: "OMEGA"
      })
    });

    const settingsA = await (await fetch(`${BASE_URL}/settings`, { headers: headersA })).json();
    const settingsB = await (await fetch(`${BASE_URL}/settings`, { headers: headersB })).json();

    if (settingsA.messName !== "Delta Elite Residence") {
      throw new Error(`Mess A settings mismatch: ${JSON.stringify(settingsA)}`);
    }
    if (settingsB.messName !== "Omega Premier Hostel") {
      throw new Error(`Mess B settings mismatch: ${JSON.stringify(settingsB)}`);
    }

    console.log("  ✓ Mess A settings intact: Name='Delta Elite Residence'");
    console.log("  ✓ Mess B settings intact: Name='Omega Premier Hostel'");
    console.log("  ✓ Zero cross-talk between tenant configurations");

    console.log("\n>>> PASS: Test Suite 4 passed access boundary and settings isolation!");
    return true;
  } finally {
    console.log("[Cleanup] Removing test messes...");
    await deleteTestMess(messA.id);
    await deleteTestMess(messB.id);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAccessBoundaryTest()
    .then(pass => process.exit(pass ? 0 : 1))
    .catch(err => {
      console.error("\nTEST SUITE 4 FAILED:", err);
      process.exit(1);
    });
}
