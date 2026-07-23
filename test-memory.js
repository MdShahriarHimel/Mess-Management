import fetch from "node-fetch";

async function run() {
  await fetch('http://localhost:3000/api/meals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer B846zoR80ueVCTDbAoN9mxJKyZL2'
    },
    body: JSON.stringify({
      monthId: 'month-uuid-202607',
      meals: [{ memberId: 'B846zoR80ueVCTDbAoN9mxJKyZL2', date: '2026-07-23', lunch: 123, dinner: 50 }]
    })
  });
  const res = await fetch('http://localhost:3000/api/meals/month-uuid-202607', {
    headers: { 'Authorization': 'Bearer B846zoR80ueVCTDbAoN9mxJKyZL2' }
  });
  const data = await res.json();
  const meal = data.meals.find(m => m.memberId === 'B846zoR80ueVCTDbAoN9mxJKyZL2' && m.date === '2026-07-23');
  console.log("Memory Meal:", meal);
}
run();
