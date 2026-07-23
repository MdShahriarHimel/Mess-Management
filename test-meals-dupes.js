fetch('http://localhost:3000/api/meals/month-uuid-202607', {
  headers: {
    'Authorization': 'Bearer admin-uuid-0000'
  }
}).then(r => r.json()).then(data => {
  const counts = {};
  if (data.meals) {
    data.meals.forEach(m => {
      const key = `${m.memberId}-${m.date}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    for (const k in counts) {
      if (counts[k] > 1) console.log("Duplicate found:", k, counts[k]);
    }
    console.log("Total meals:", data.meals.length);
  } else {
    console.log("No meals or error", data);
  }
}).catch(console.error);
