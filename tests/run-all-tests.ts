import { runDataIsolationTest } from "./1-data-isolation.test.js";
import { runConcurrencyStressTest } from "./2-concurrency-stress.test.js";
import { runSwitchingZeroOverwriteTest } from "./3-switching-zero-overwrite.test.js";
import { runAccessBoundaryTest } from "./4-access-boundary.test.js";

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║     MESS ERP MULTI-TENANT ISOLATION & CONCURRENCY SUITE      ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  const suites = [
    { name: "Suite 1: Cross-Tenant Data Isolation (Members, Deposits, Markets, Notices)", fn: runDataIsolationTest },
    { name: "Suite 2: Concurrency & Stress Isolation (60 Concurrent Requests)", fn: runConcurrencyStressTest },
    { name: "Suite 3: Rapid Mess Switching & Zero-Overwrite Immunity", fn: runSwitchingZeroOverwriteTest },
    { name: "Suite 4: Access Boundaries, Security RBAC & Settings Isolation", fn: runAccessBoundaryTest }
  ];

  const results: { name: string; passed: boolean; durationMs: number; error?: any }[] = [];
  const overallStart = Date.now();

  for (const suite of suites) {
    const start = Date.now();
    try {
      const passed = await suite.fn();
      results.push({ name: suite.name, passed, durationMs: Date.now() - start });
    } catch (error) {
      console.error(`\n❌ Error in ${suite.name}:`, error);
      results.push({ name: suite.name, passed: false, durationMs: Date.now() - start, error });
    }
  }

  const totalTime = Date.now() - overallStart;

  console.log("\n============================================================");
  console.log("TEST EXECUTION SUMMARY");
  console.log("============================================================");

  let totalPassed = 0;
  for (const r of results) {
    const status = r.passed ? "✅ PASSED" : "❌ FAILED";
    console.log(`${status} [${r.durationMs}ms] - ${r.name}`);
    if (r.passed) totalPassed++;
  }

  console.log("------------------------------------------------------------");
  console.log(`Total Test Suites: ${results.length} | Passed: ${totalPassed} | Failed: ${results.length - totalPassed}`);
  console.log(`Total Execution Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log("============================================================\n");

  if (totalPassed === results.length) {
    console.log("🎉 ALL MULTI-TENANT ISOLATION TESTS PASSED WITH 100% SUCCESS!\n");
    process.exit(0);
  } else {
    console.error("💥 SOME TESTS FAILED. PLEASE REVIEW THE LOGS ABOVE.\n");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal test runner crash:", err);
  process.exit(1);
});
