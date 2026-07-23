import { loadDB } from "./server/db.js";

const db = loadDB();
console.log("Total meals in DB:", db.meals.length);
const found = db.meals.filter(m => m.monthId === 'month-uuid-202607' && m.memberId === 'B846zoR80ueVCTDbAoN9mxJKyZL2' && m.date === '2026-07-23');
console.log("Found meals for B846zoR80ueVCTDbAoN9mxJKyZL2 on 2026-07-23:", found);
