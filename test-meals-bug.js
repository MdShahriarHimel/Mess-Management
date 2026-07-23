const m = { lunch: 1, dinner: "0.5", breakfast: 0 };
const mealTypes = [
  { id: "lunch" },
  { id: "dinner" },
  { id: "breakfast" }
];
const dbMeal = { lunch: 0, dinner: 0, breakfast: 0 };
mealTypes.forEach(t => {
  dbMeal[t.id] = Number(m[t.id]) || 0;
});
console.log(dbMeal);
