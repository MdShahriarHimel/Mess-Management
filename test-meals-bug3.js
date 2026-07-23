const m = { lunch: 0.5 };
const dbMeal = { lunch: 1 };
dbMeal.lunch = Number(m.lunch) || 0;
console.log(dbMeal);
