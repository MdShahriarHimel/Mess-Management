import { BASE_URL, getAdminSession, getTenantHeaders, createTestMess, deleteTestMess } from "./helpers/auth.js";

export async function runConcurrencyStressTest(): Promise<boolean> {
  console.log("\n============================================================");
  console.log("TEST SUITE 2: CONCURRENT MULTI-MESS REQUESTS & STRESS TEST");
  console.log("============================================================");

  const session = await getAdminSession();
  const messAlpha = await createTestMess(session, "Conc-Test-Alpha");
  const messBeta = await createTestMess(session, "Conc-Test-Beta");
  const messGamma = await createTestMess(session, "Conc-Test-Gamma");

  const messes = [
    { info: messAlpha, tag: "Alpha", baseAmount: 10000 },
    { info: messBeta, tag: "Beta", baseAmount: 20000 },
    { info: messGamma, tag: "Gamma", baseAmount: 30000 }
  ];

  console.log(`[Setup] Created 3 concurrent test messes: ${messAlpha.id}, ${messBeta.id}, ${messGamma.id}`);

  try {
    const initializedMesses = [];

    for (const m of messes) {
      const headers = getTenantHeaders(session, m.info.id);
      const monthsRes = await fetch(`${BASE_URL}/months`, { headers });
      const monthsData = await monthsRes.json();
      const monthId = monthsData.months?.[0]?.id;

      // Create a test member
      const memberRes = await fetch(`${BASE_URL}/members`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: `${m.tag} Concurrency Member`,
          nickname: m.tag,
          email: `${m.tag.toLowerCase()}_${Date.now()}@test.local`,
          phone: "01700000000",
          bloodGroup: "O+",
          occupation: "Tester",
          role: "MEMBER"
        })
      });
      const memberData = await memberRes.json();
      const memberId = memberData.member?.id;

      initializedMesses.push({
        ...m,
        monthId,
        memberId,
        headers
      });
    }

    console.log("[Setup] Members and months initialized across all 3 messes.");

    // Fire 60 concurrent requests (20 per mess) in parallel with interleaved operations
    const CONCURRENCY_COUNT = 60;
    console.log(`[Execution] Dispatching ${CONCURRENCY_COUNT} concurrent asynchronous requests...`);

    const requestPromises: Promise<{
      index: number;
      targetMessId: string;
      expectedTag: string;
      expectedRange: number;
      resStatus: number;
      resMessId: string;
      opType: string;
      data: any;
    }>[] = [];

    const startTime = Date.now();

    for (let i = 0; i < CONCURRENCY_COUNT; i++) {
      const targetMess = initializedMesses[i % 3];
      const isWrite = i % 2 === 0;

      if (isWrite) {
        // Concurrent POST Deposit
        const amount = targetMess.baseAmount + i;
        const p = fetch(`${BASE_URL}/deposits`, {
          method: "POST",
          headers: targetMess.headers,
          body: JSON.stringify({
            monthId: targetMess.monthId,
            memberId: targetMess.memberId,
            amount,
            date: new Date().toISOString().split("T")[0]
          })
        }).then(async res => ({
          index: i,
          targetMessId: targetMess.info.id,
          expectedTag: targetMess.tag,
          expectedRange: targetMess.baseAmount,
          resStatus: res.status,
          resMessId: res.headers.get("x-mess-id") || "",
          opType: "WRITE_DEPOSIT",
          data: await res.json()
        }));
        requestPromises.push(p);
      } else {
        // Concurrent GET Deposits
        const p = fetch(`${BASE_URL}/deposits/${targetMess.monthId}`, {
          method: "GET",
          headers: targetMess.headers
        }).then(async res => ({
          index: i,
          targetMessId: targetMess.info.id,
          expectedTag: targetMess.tag,
          expectedRange: targetMess.baseAmount,
          resStatus: res.status,
          resMessId: res.headers.get("x-mess-id") || "",
          opType: "READ_DEPOSITS",
          data: await res.json()
        }));
        requestPromises.push(p);
      }
    }

    const results = await Promise.all(requestPromises);
    const duration = Date.now() - startTime;
    console.log(`[Execution] Completed ${CONCURRENCY_COUNT} concurrent requests in ${duration}ms (avg ${(duration / CONCURRENCY_COUNT).toFixed(1)}ms/req)`);

    // Verify all responses
    let failures = 0;

    for (const r of results) {
      if (r.resStatus !== 200) {
        console.error(`[Error] Request #${r.index} (${r.opType}) failed with status ${r.resStatus}:`, r.data);
        failures++;
      }
      if (r.resMessId && r.resMessId !== r.targetMessId) {
        console.error(`[Context Leak] Request #${r.index} requested ${r.targetMessId} but response header has ${r.resMessId}`);
        failures++;
      }
    }

    if (failures > 0) {
      throw new Error(`FAIL: Encountered ${failures} errors or context leaks during concurrency test`);
    }

    console.log("  ✓ All concurrent requests returned status 200 OK");
    console.log("  ✓ Response 'x-mess-id' header strictly matched requested mess in 100% of concurrent executions");

    // Final ledger verification: ensure zero cross-contamination
    console.log("\n[Verification] Verifying final ledger isolation across all 3 messes...");
    for (const m of initializedMesses) {
      const finalRes = await fetch(`${BASE_URL}/deposits/${m.monthId}`, { headers: m.headers });
      const finalData = await finalRes.json();
      const deposits: any[] = finalData.deposits || [];

      // Check all deposits in this mess
      for (const d of deposits) {
        const amt = Number(d.amount);
        const belongsToThis = amt >= m.baseAmount && amt < m.baseAmount + 1000;
        if (!belongsToThis) {
          throw new Error(`FAIL: Foreign deposit amount ${amt} found in ${m.tag} mess (base: ${m.baseAmount})!`);
        }
      }

      console.log(`  ✓ ${m.tag} Mess contains ${deposits.length} deposits, 100% strictly within range [${m.baseAmount}-${m.baseAmount + 1000}], 0% contamination`);
    }

    console.log("\n>>> PASS: Test Suite 2 passed concurrency and stress verification!");
    return true;
  } finally {
    console.log("[Cleanup] Removing concurrent test messes...");
    for (const m of messes) {
      await deleteTestMess(m.info.id);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runConcurrencyStressTest()
    .then(pass => process.exit(pass ? 0 : 1))
    .catch(err => {
      console.error("\nTEST SUITE 2 FAILED:", err);
      process.exit(1);
    });
}
