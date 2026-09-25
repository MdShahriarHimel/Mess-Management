import { BASE_URL, getAdminSession, getTenantHeaders, createTestMess, deleteTestMess } from "./helpers/auth.js";

export async function runDataIsolationTest(): Promise<boolean> {
  console.log("\n============================================================");
  console.log("TEST SUITE 1: CROSS-TENANT DATA ISOLATION VERIFICATION");
  console.log("============================================================");

  const session = await getAdminSession();
  const messA = await createTestMess(session, "Isolation-Test-Mess-A");
  const messB = await createTestMess(session, "Isolation-Test-Mess-B");

  console.log(`[Setup] Created Mess A (id: ${messA.id}) and Mess B (id: ${messB.id})`);

  try {
    const headersA = getTenantHeaders(session, messA.id);
    const headersB = getTenantHeaders(session, messB.id);

    // 1. Get initial month for each mess
    const monthsResA = await fetch(`${BASE_URL}/months`, { headers: headersA });
    const monthsDataA = await monthsResA.json();
    const monthIdA = monthsDataA.months?.[0]?.id;

    const monthsResB = await fetch(`${BASE_URL}/months`, { headers: headersB });
    const monthsDataB = await monthsResB.json();
    const monthIdB = monthsDataB.months?.[0]?.id;

    if (!monthIdA || !monthIdB) {
      throw new Error(`Failed to resolve month IDs (A: ${monthIdA}, B: ${monthIdB})`);
    }

    // 2. Add Member to Mess A
    const addMemberResA = await fetch(`${BASE_URL}/members`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        name: "Alice Walker",
        nickname: "Alice",
        email: `alice_${Date.now()}@test-iso-a.local`,
        phone: "01711111111",
        bloodGroup: "A+",
        occupation: "Engineer",
        role: "MEMBER"
      })
    });
    const addMemberDataA = await addMemberResA.json();
    const memberAliceId = addMemberDataA.member?.id;
    console.log(`[Mess A] Added member Alice (id: ${memberAliceId})`);

    // 3. Add Member to Mess B
    const addMemberResB = await fetch(`${BASE_URL}/members`, {
      method: "POST",
      headers: headersB,
      body: JSON.stringify({
        name: "Bob Builder",
        nickname: "Bob",
        email: `bob_${Date.now()}@test-iso-b.local`,
        phone: "01722222222",
        bloodGroup: "B+",
        occupation: "Architect",
        role: "MEMBER"
      })
    });
    const addMemberDataB = await addMemberResB.json();
    const memberBobId = addMemberDataB.member?.id;
    console.log(`[Mess B] Added member Bob (id: ${memberBobId})`);

    // 4. Add Deposit in Mess A
    const depResA = await fetch(`${BASE_URL}/deposits`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        monthId: monthIdA,
        memberId: memberAliceId,
        amount: 5500,
        date: new Date().toISOString().split("T")[0],
        notes: "DEP_SECRET_MESS_A_ONLY"
      })
    });
    if (!depResA.ok) throw new Error(`Deposit in Mess A failed: ${await depResA.text()}`);
    console.log("[Mess A] Recorded 5500 BDT deposit for Alice with unique tag");

    // 5. Add Deposit in Mess B
    const depResB = await fetch(`${BASE_URL}/deposits`, {
      method: "POST",
      headers: headersB,
      body: JSON.stringify({
        monthId: monthIdB,
        memberId: memberBobId,
        amount: 8800,
        date: new Date().toISOString().split("T")[0],
        notes: "DEP_SECRET_MESS_B_ONLY"
      })
    });
    if (!depResB.ok) throw new Error(`Deposit in Mess B failed: ${await depResB.text()}`);
    console.log("[Mess B] Recorded 8800 BDT deposit for Bob with unique tag");

    // 6. Add Market Entry in Mess A
    const mktResA = await fetch(`${BASE_URL}/markets`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        monthId: monthIdA,
        memberId: memberAliceId,
        amount: 1450,
        date: new Date().toISOString().split("T")[0],
        description: "MKT_EXPENSE_MESS_A_CHICKEN"
      })
    });
    if (!mktResA.ok) throw new Error(`Market entry in Mess A failed: ${await mktResA.text()}`);
    console.log("[Mess A] Recorded 1450 BDT market expense for Chicken");

    // 7. Add Market Entry in Mess B
    const mktResB = await fetch(`${BASE_URL}/markets`, {
      method: "POST",
      headers: headersB,
      body: JSON.stringify({
        monthId: monthIdB,
        memberId: memberBobId,
        amount: 2900,
        date: new Date().toISOString().split("T")[0],
        description: "MKT_EXPENSE_MESS_B_BEEF"
      })
    });
    if (!mktResB.ok) throw new Error(`Market entry in Mess B failed: ${await mktResB.text()}`);
    console.log("[Mess B] Recorded 2900 BDT market expense for Beef");

    // 8. Add Notice in Mess A
    await fetch(`${BASE_URL}/notices`, {
      method: "POST",
      headers: headersA,
      body: JSON.stringify({
        title: "NOTICE_ALPHA_EXCLUSIVE",
        content: "Alpha mess rules meeting at 9 PM",
        pinned: true
      })
    });

    // 9. Add Notice in Mess B
    await fetch(`${BASE_URL}/notices`, {
      method: "POST",
      headers: headersB,
      body: JSON.stringify({
        title: "NOTICE_BETA_EXCLUSIVE",
        content: "Beta mess electricity bill notice",
        pinned: false
      })
    });

    // =========================================================================
    // VERIFICATIONS
    // =========================================================================
    console.log("\n[Verification] Validating isolation across all resources...");

    // V1: Members isolation
    const membersA = (await (await fetch(`${BASE_URL}/members`, { headers: headersA })).json()).members || [];
    const membersB = (await (await fetch(`${BASE_URL}/members`, { headers: headersB })).json()).members || [];

    const aliceInA = membersA.some((m: any) => m.name === "Alice Walker");
    const bobInA = membersA.some((m: any) => m.name === "Bob Builder");
    const aliceInB = membersB.some((m: any) => m.name === "Alice Walker");
    const bobInB = membersB.some((m: any) => m.name === "Bob Builder");

    if (!aliceInA) throw new Error("FAIL: Alice Walker missing from Mess A");
    if (bobInA) throw new Error("FAIL: Bob Builder leaked into Mess A!");
    if (!bobInB) throw new Error("FAIL: Bob Builder missing from Mess B");
    if (aliceInB) throw new Error("FAIL: Alice Walker leaked into Mess B!");
    console.log("  ✓ Member records strictly isolated (0% cross-contamination)");

    // V2: Deposits isolation
    const depositsA = (await (await fetch(`${BASE_URL}/deposits/${monthIdA}`, { headers: headersA })).json()).deposits || [];
    const depositsB = (await (await fetch(`${BASE_URL}/deposits/${monthIdB}`, { headers: headersB })).json()).deposits || [];

    const depAInA = depositsA.some((d: any) => d.memberId === memberAliceId && d.amount === 5500);
    const depBInA = depositsA.some((d: any) => d.memberId === memberBobId && d.amount === 8800);
    const depAInB = depositsB.some((d: any) => d.memberId === memberAliceId && d.amount === 5500);
    const depBInB = depositsB.some((d: any) => d.memberId === memberBobId && d.amount === 8800);

    if (!depAInA) throw new Error("FAIL: Mess A deposit missing in Mess A");
    if (depBInA) throw new Error("FAIL: Mess B deposit leaked into Mess A!");
    if (!depBInB) throw new Error("FAIL: Mess B deposit missing in Mess B");
    if (depAInB) throw new Error("FAIL: Mess A deposit leaked into Mess B!");
    console.log("  ✓ Deposit ledger strictly isolated (0% cross-contamination)");

    // V3: Market expense isolation
    const marketsA = (await (await fetch(`${BASE_URL}/markets/${monthIdA}`, { headers: headersA })).json()).markets || [];
    const marketsB = (await (await fetch(`${BASE_URL}/markets/${monthIdB}`, { headers: headersB })).json()).markets || [];

    const mktAInA = marketsA.some((m: any) => m.description === "MKT_EXPENSE_MESS_A_CHICKEN");
    const mktBInA = marketsA.some((m: any) => m.description === "MKT_EXPENSE_MESS_B_BEEF");
    const mktAInB = marketsB.some((m: any) => m.description === "MKT_EXPENSE_MESS_A_CHICKEN");
    const mktBInB = marketsB.some((m: any) => m.description === "MKT_EXPENSE_MESS_B_BEEF");

    if (!mktAInA) throw new Error("FAIL: Mess A chicken market missing in Mess A");
    if (mktBInA) throw new Error("FAIL: Mess B beef market leaked into Mess A!");
    if (!mktBInB) throw new Error("FAIL: Mess B beef market missing in Mess B");
    if (mktAInB) throw new Error("FAIL: Mess A chicken market leaked into Mess B!");
    console.log("  ✓ Market expenses strictly isolated (0% cross-contamination)");

    // V4: Notices isolation
    const noticesA = (await (await fetch(`${BASE_URL}/notices`, { headers: headersA })).json()).notices || [];
    const noticesB = (await (await fetch(`${BASE_URL}/notices`, { headers: headersB })).json()).notices || [];

    const notAInA = noticesA.some((n: any) => n.title === "NOTICE_ALPHA_EXCLUSIVE");
    const notBInA = noticesA.some((n: any) => n.title === "NOTICE_BETA_EXCLUSIVE");
    const notAInB = noticesB.some((n: any) => n.title === "NOTICE_ALPHA_EXCLUSIVE");
    const notBInB = noticesB.some((n: any) => n.title === "NOTICE_BETA_EXCLUSIVE");

    if (!notAInA) throw new Error("FAIL: Notice Alpha missing from Mess A");
    if (notBInA) throw new Error("FAIL: Notice Beta leaked into Mess A!");
    if (!notBInB) throw new Error("FAIL: Notice Beta missing from Mess B");
    if (notAInB) throw new Error("FAIL: Notice Alpha leaked into Mess B!");
    console.log("  ✓ Notice board strictly isolated (0% cross-contamination)");

    console.log("\n>>> PASS: Test Suite 1 passed with 100% data isolation!");
    return true;
  } finally {
    console.log(`[Cleanup] Removing temporary test messes ${messA.id} and ${messB.id}...`);
    await deleteTestMess(messA.id);
    await deleteTestMess(messB.id);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDataIsolationTest()
    .then(pass => process.exit(pass ? 0 : 1))
    .catch(err => {
      console.error("\nTEST SUITE 1 FAILED:", err);
      process.exit(1);
    });
}
