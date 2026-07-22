import { db } from "../src/db/index.js";
import { 
  members as membersTable,
  months as monthsTable,
  meals as mealsTable,
  foodMenus as foodMenusTable,
  marketEntries as marketEntriesTable,
  deposits as depositsTable,
  bills as billsTable,
  duties as dutiesTable,
  managerHoldings as managerHoldingsTable,
  managerRatings as managerRatingsTable,
  notices as noticesTable,
  auditLogs as auditLogsTable,
  mealRequests as mealRequestsTable,
  persistentFiles as persistentFilesTable
} from "../src/db/schema.js";
import { eq } from "drizzle-orm";

const tablesMap: Record<string, any> = {
  members: membersTable,
  months: monthsTable,
  meals: mealsTable,
  foodMenus: foodMenusTable,
  marketEntries: marketEntriesTable,
  deposits: depositsTable,
  bills: billsTable,
  duties: dutiesTable,
  managerHoldings: managerHoldingsTable,
  managerRatings: managerRatingsTable,
  notices: noticesTable,
  auditLogs: auditLogsTable,
  mealRequests: mealRequestsTable
};

export async function dbInsert(tableName: string, data: any) {
  try {
    const table = tablesMap[tableName];
    if (table) await db.insert(table).values(data);
  } catch (e) {
    console.error(`Incremental INSERT failed on ${tableName}:`, e);
  }
}

export async function dbUpdate(tableName: string, id: string, data: any) {
  try {
    const table = tablesMap[tableName];
    if (table) await db.update(table).set(data).where(eq(table.id, id));
  } catch (e) {
    console.error(`Incremental UPDATE failed on ${tableName}:`, e);
  }
}

export async function dbDelete(tableName: string, id: string) {
  try {
    const table = tablesMap[tableName];
    if (table) await db.delete(table).where(eq(table.id, id));
  } catch (e) {
    console.error(`Incremental DELETE failed on ${tableName}:`, e);
  }
}
