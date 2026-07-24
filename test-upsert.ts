import { db } from "./src/db/index.ts";
import { meals as mealsTable } from "./src/db/schema.ts";
import { and, eq } from "drizzle-orm";

async function main() {
  const monthId = "month-uuid-202607";
  const memberId = "Fx6IoOwPsYcQc80bcfgghha45jb2";
  const date = "2026-07-24";
  const mealTypes = [
    { id: "lunch", name: "Lunch", enabled: true },
    { id: "dinner", name: "Dinner", enabled: true },
    { id: "breakfast", name: "Breakfast", enabled: false }
  ];
  
  const m = {
    memberId,
    date,
    lunch: 1.5,
    dinner: 2.0,
    breakfast: 0
  };

  try {
    await db.transaction(async (tx) => {
      // Find existing
      const existing = await tx.select().from(mealsTable).where(
        and(
          eq(mealsTable.monthId, monthId),
          eq(mealsTable.memberId, m.memberId),
          eq(mealsTable.date, m.date)
        )
      ).limit(1);

      console.log("Existing rows before upsert:", existing);

      if (existing.length > 0) {
        const updatedMeal: any = { ...existing[0] };
        mealTypes.forEach((t: any) => {
          updatedMeal[t.id] = Number((m as any)[t.id]) || 0;
        });
        console.log("Updating to:", updatedMeal);
        await tx.update(mealsTable)
          .set(updatedMeal)
          .where(eq(mealsTable.id, existing[0].id));
      } else {
        const newMeal: any = {
          id: "test-idx-upsert-123",
          monthId,
          memberId: m.memberId,
          date: m.date
        };
        mealTypes.forEach((t: any) => {
          newMeal[t.id] = Number((m as any)[t.id]) || 0;
        });
        console.log("Inserting new:", newMeal);
        await tx.insert(mealsTable).values(newMeal);
      }
    });

    const verify = await db.select().from(mealsTable).where(
      and(
        eq(mealsTable.monthId, monthId),
        eq(mealsTable.memberId, memberId),
        eq(mealsTable.date, date)
      )
    );
    console.log("Verified rows after upsert:", verify);
  } catch (err) {
    console.error("UPSERT TRANSACTION ERROR:", err);
  }
}

main();
