import fetch from "node-fetch";

async function main() {
  const currentMonthId = "month-uuid-202607";
  const selectedDate = "2026-07-24";
  const adminId = "B846zoR80ueVCTDbAoN9mxJKyZL2";

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

  console.log("1. Sending POST /api/meals...");
  try {
    const postRes = await fetch("http://localhost:3000/api/meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminId}`
      },
      body: JSON.stringify({
        monthId: currentMonthId,
        meals: mealsToSave
      })
    });

    console.log("POST Response Status:", postRes.status);
    const postData = await postRes.json();
    console.log("POST Response Data:", postData);

    console.log("\n2. Sending GET /api/meals/:monthId...");
    const getRes = await fetch(`http://localhost:3000/api/meals/${currentMonthId}`, {
      headers: {
        "Authorization": `Bearer ${adminId}`
      }
    });

    console.log("GET Response Status:", getRes.status);
    const getData = await getRes.json();
    console.log("GET Response Data meals count:", getData.meals?.length);
    const savedForDate = getData.meals?.filter((m: any) => m.date === selectedDate);
    console.log(`Meals saved for date ${selectedDate}:`, savedForDate);

  } catch (err) {
    console.error("Error in simulation:", err);
  }
}

main();
