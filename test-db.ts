import { db } from "./src/db/index.ts";
import { meals as mealsTable } from "./src/db/schema.ts";

async function main() {
  try {
    const allMeals = await db.select().from(mealsTable).limit(10);
    console.log("SUCCESS. Row count limit 10:", allMeals);
  } catch (err) {
    console.error("DATABASE QUERY ERROR:", err);
  }
}

main();
