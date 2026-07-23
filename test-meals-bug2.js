const m = { lunch: 0, dinner: 0, breakfast: 0 };
const mealTypes = [
  { id: "lunch" },
  { id: "dinner" },
  { id: "breakfast" }
];
const dbMeal = { lunch: 1, dinner: 2, breakfast: 3 };
mealTypes.forEach(t => {
  dbMeal[t.id] = Number(m[t.id]) || 0;
});
console.log(dbMeal);
