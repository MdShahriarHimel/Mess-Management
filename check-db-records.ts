import { db } from "./src/db/index.ts";
import { months as monthsTable, meals as mealsTable, members as membersTable } from "./src/db/schema.ts";

async function main() {
  try {
    const monthsList = await db.select().from(monthsTable);
    console.log("=== MONTHS ===");
    console.log(monthsList);

    const mealsList = await db.select().from(mealsTable);
    console.log("=== MEALS ===");
    console.log(mealsList);

    const membersList = await db.select().from(membersTable);
    console.log("=== MEMBERS ===");
    console.log(membersList.map(m => ({ id: m.id, name: m.name, role: m.role, status: m.status })));
  } catch (err) {
    console.error("Error reading records:", err);
  }
}

main();
