import { db } from "./src/db/index.ts";
import { meals as mealsTable } from "./src/db/schema.ts";
import { and, eq } from "drizzle-orm";

async function main() {
  const monthId = "month-uuid-202607";
  const selectedDate = "2026-07-24";

  const mealsToSave = [
    {
      memberId: "Fx6IoOwPsYcQc80bcfgghha45jb2", // Raju
      date: selectedDate,
      lunch: 3,
      dinner: 4,
      breakfast: 0
    },
    {
      memberId: "B846zoR80ueVCTDbAoN9mxJKyZL2", // Himel
      date: selectedDate,
      lunch: 2.5,
      dinner: 0,
      breakfast: 1.5
    }
  ];

  const mealTypes = [
    { id: "lunch", name: "Lunch", enabled: true },
    { id: "dinner", name: "Dinner", enabled: true },
    { id: "breakfast", name: "Breakfast", enabled: false }
  ];

  console.log("Starting direct upsert test...");

  try {
    await db.transaction(async (tx) => {
      for (const m of mealsToSave) {
        console.log(`\nProcessing member: ${m.memberId}`);
        const existing = await tx.select().from(mealsTable).where(
          and(
            eq(mealsTable.monthId, monthId),
            eq(mealsTable.memberId, m.memberId),
            eq(mealsTable.date, m.date)
          )
        ).limit(1);

        console.log(`Found existing rows: ${existing.length}`);
        if (existing.length > 0) {
          console.log("Existing row details:", existing[0]);
          const updatedMeal: any = { ...existing[0] };
          mealTypes.forEach((t: any) => {
            const inputVal = (m as any)[t.id];
            const parsed = Number(inputVal);
            updatedMeal[t.id] = isNaN(parsed) ? 0 : parsed;
          });
          console.log("Updating to:", updatedMeal);
          const updateResult = await tx.update(mealsTable)
            .set(updatedMeal)
            .where(eq(mealsTable.id, existing[0].id));
          console.log("Update complete. Result:", updateResult);
        } else {
          console.log("No existing row found. Inserting new row...");
        }
      }
    });

    console.log("\nDirect upsert test transaction finished. Fetching rows to verify...");
    const verifiedRows = await db.select().from(mealsTable).where(
      and(
        eq(mealsTable.monthId, monthId),
        eq(mealsTable.date, selectedDate)
      )
    );
    console.log("Verified rows in DB:", verifiedRows);

  } catch (err) {
    console.error("Error during direct upsert test:", err);
  }
}

main();
