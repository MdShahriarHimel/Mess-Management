import fs from "fs";
import path from "path";
import { BASE_URL, getAdminSession, getTenantHeaders, createTestMess, deleteTestMess } from "./helpers/auth.js";

export async function runSwitchingZeroOverwriteTest(): Promise<boolean> {
  console.log("\n============================================================");
  console.log("TEST SUITE 3: RAPID MESS SWITCHING & ZERO-OVERWRITE IMMUNITY");
  console.log("============================================================");

  const session = await getAdminSession();
  const realMess = await createTestMess(session, "Real-Populated-Mess");
  const zeroMess = await createTestMess(session, "Brand-New-Empty-Mess");

  console.log(`[Setup] Created Real Mess (${realMess.id}) and Empty Mess (${zeroMess.id})`);

  try {
    const realHeaders = getTenantHeaders(session, realMess.id);
    const zeroHeaders = getTenantHeaders(session, zeroMess.id);

    // 1. Get month for Real Mess
    const realMonthsRes = await fetch(`${BASE_URL}/months`, { headers: realHeaders });
    const realMonthsData = await realMonthsRes.json();
    const realMonthId = realMonthsData.months?.[0]?.id;

    // 2. Populate Real Mess with non-zero data
    const memberNames = ["Tahsin", "Zubair", "Hashem"];
    const populatedMemberIds: string[] = [];

    for (const name of memberNames) {
      const res = await fetch(`${BASE_URL}/members`, {
        method: "POST",
        headers: realHeaders,
        body: JSON.stringify({
          name,
          nickname: name,
          email: `${name.toLowerCase()}_${Date.now()}@realmess.local`,
          phone: "01700000000",
          bloodGroup: "B+",
          occupation: "Student",
          role: "MEMBER"
        })
      });
      const data = await res.json();
      populatedMemberIds.push(data.member.id);
    }

    // Add deposits in Real Mess (Total = 15,500 BDT)
    const depositAmounts = [4000, 6000, 5500];
    for (let i = 0; i < depositAmounts.length; i++) {
      await fetch(`${BASE_URL}/deposits`, {
        method: "POST",
        headers: realHeaders,
        body: JSON.stringify({
          monthId: realMonthId,
          memberId: populatedMemberIds[i],
          amount: depositAmounts[i],
          date: new Date().toISOString().split("T")[0]
        })
      });
    }

    // Add market expenses in Real Mess (Total = 4,000 BDT)
    const marketExpenses = [1800, 2200];
    for (let i = 0; i < marketExpenses.length; i++) {
      await fetch(`${BASE_URL}/markets`, {
        method: "POST",
        headers: realHeaders,
        body: JSON.stringify({
          monthId: realMonthId,
          memberId: populatedMemberIds[i],
          amount: marketExpenses[i],
          date: new Date().toISOString().split("T")[0],
          description: `Market Expense #${i + 1}`
        })
      });
    }

    console.log("[Setup] Populated Real Mess with 3 members, 15,500 BDT deposits, and 4,000 BDT market expenses.");

    // Verify baseline snapshot
    const baselineMembers = (await (await fetch(`${BASE_URL}/members`, { headers: realHeaders })).json()).members || [];
    const baselineDeposits = (await (await fetch(`${BASE_URL}/deposits/${realMonthId}`, { headers: realHeaders })).json()).deposits || [];
    const baselineMarkets = (await (await fetch(`${BASE_URL}/markets/${realMonthId}`, { headers: realHeaders })).json()).markets || [];

    const baselineTotalDeposits = baselineDeposits.reduce((acc: number, d: any) => acc + Number(d.amount), 0);
    const baselineTotalMarkets = baselineMarkets.reduce((acc: number, m: any) => acc + Number(m.amount), 0);

    console.log(`[Baseline] Real Mess: ${baselineMembers.length} members, Total Deposits: ${baselineTotalDeposits} BDT, Total Markets: ${baselineTotalMarkets} BDT`);

    if (baselineTotalDeposits !== 15500 || baselineTotalMarkets !== 4000) {
      throw new Error(`Baseline mismatch! Deposits: ${baselineTotalDeposits}, Markets: ${baselineTotalMarkets}`);
    }

    // 3. Perform 20 Rapid Mess Switching cycles
    const CYCLES = 20;
    console.log(`\n[Execution] Simulating ${CYCLES} rapid switches between Empty Mess (zeroes) and Real Mess...`);

    for (let c = 1; c <= CYCLES; c++) {
      // Step A: Switch to Empty Mess and read zero state
      const emptyRes = await fetch(`${BASE_URL}/members`, { headers: zeroHeaders });
      const emptyMembers = (await emptyRes.json()).members || [];
      
      // Step B: Update a setting or notice in Empty Mess
      await fetch(`${BASE_URL}/notices`, {
        method: "POST",
        headers: zeroHeaders,
        body: JSON.stringify({
          title: `Empty Mess Ping ${c}`,
          content: "Testing zero isolation"
        })
      });

      // Step C: Switch back to Real Mess immediately and verify NO zero overwrite occurred
      const checkMembers = (await (await fetch(`${BASE_URL}/members`, { headers: realHeaders })).json()).members || [];
      const checkDeposits = (await (await fetch(`${BASE_URL}/deposits/${realMonthId}`, { headers: realHeaders })).json()).deposits || [];
      const checkMarkets = (await (await fetch(`${BASE_URL}/markets/${realMonthId}`, { headers: realHeaders })).json()).markets || [];

      const currentTotalDeposits = checkDeposits.reduce((acc: number, d: any) => acc + Number(d.amount), 0);
      const currentTotalMarkets = checkMarkets.reduce((acc: number, m: any) => acc + Number(m.amount), 0);

      // Strict zero-overwrite assertions
      if (checkMembers.length !== baselineMembers.length) {
        throw new Error(`CRITICAL OVERWRITE at cycle ${c}: Members count changed from ${baselineMembers.length} to ${checkMembers.length}!`);
      }
      if (currentTotalDeposits !== 15500) {
        throw new Error(`CRITICAL OVERWRITE at cycle ${c}: Deposits wiped/changed from 15500 to ${currentTotalDeposits}!`);
      }
      if (currentTotalMarkets !== 4000) {
        throw new Error(`CRITICAL OVERWRITE at cycle ${c}: Market expenses wiped/changed from 4000 to ${currentTotalMarkets}!`);
      }
    }

    console.log(`  ✓ Completed all ${CYCLES} rapid mess switches without a single zero-data leak or overwrite`);

    // 4. Verify physical disk persistence files
    console.log("\n[Persistence Verification] Verifying disk backup files are independent and uncorrupted...");
    const DB_DIR = path.resolve(process.cwd(), "data");
    const realFile = path.join(DB_DIR, `database_backup_${realMess.id}.json`);
    const zeroFile = path.join(DB_DIR, `database_backup_${zeroMess.id}.json`);

    if (!fs.existsSync(realFile)) throw new Error(`Missing disk file: ${realFile}`);
    if (!fs.existsSync(zeroFile)) throw new Error(`Missing disk file: ${zeroFile}`);

    const realContent = JSON.parse(fs.readFileSync(realFile, "utf-8"));
    const zeroContent = JSON.parse(fs.readFileSync(zeroFile, "utf-8"));

    const diskDepositsSum = (realContent.deposits || []).reduce((acc: number, d: any) => acc + Number(d.amount), 0);
    const diskMarketsSum = (realContent.marketEntries || []).reduce((acc: number, m: any) => acc + Number(m.amount), 0);

    if (diskDepositsSum !== 15500 || diskMarketsSum !== 4000) {
      throw new Error(`Disk persistence file corrupted! Deposits on disk: ${diskDepositsSum}, Markets: ${diskMarketsSum}`);
    }

    // Ensure zero file has 0 deposits and 0 market entries
    if ((zeroContent.deposits || []).length !== 0) {
      throw new Error(`Zero file contains leaked deposits: ${zeroContent.deposits.length}`);
    }
    if ((zeroContent.marketEntries || []).length !== 0) {
      throw new Error(`Zero file contains leaked markets: ${zeroContent.marketEntries.length}`);
    }

    console.log("  ✓ Physical file on disk for Real Mess contains 15,500 BDT deposits & 4,000 BDT markets");
    console.log("  ✓ Physical file on disk for Zero Mess contains strictly 0 deposits & 0 markets");

    console.log("\n>>> PASS: Test Suite 3 passed zero-overwrite immunity verification!");
    return true;
  } finally {
    console.log("[Cleanup] Removing test messes...");
    await deleteTestMess(realMess.id);
    await deleteTestMess(zeroMess.id);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSwitchingZeroOverwriteTest()
    .then(pass => process.exit(pass ? 0 : 1))
    .catch(err => {
      console.error("\nTEST SUITE 3 FAILED:", err);
      process.exit(1);
    });
}
