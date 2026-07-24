import { db } from "./src/db/index.ts";
import { auditLogs as auditLogsTable } from "./src/db/schema.ts";
import { desc } from "drizzle-orm";

async function main() {
  try {
    const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.timestamp)).limit(20);
    console.log("=== LATEST 20 AUDIT LOGS ===");
    console.log(logs);
  } catch (err) {
    console.error("Error reading audit logs:", err);
  }
}

main();
