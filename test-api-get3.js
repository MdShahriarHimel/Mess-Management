import fetch from "node-fetch";

async function run() {
  const res = await fetch('http://localhost:3000/api/meals/month-uuid-202607', {
    headers: { 'Authorization': 'Bearer B846zoR80ueVCTDbAoN9mxJKyZL2' }
  });
  const data = await res.json();
  const meals = data.meals.filter(m => m.memberId === 'B846zoR80ueVCTDbAoN9mxJKyZL2' && m.date === '2026-07-23');
  console.log("Memory Meals:", meals.length, meals);
}
run();
