fetch('http://localhost:3000/api/meals', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin-uuid-0000'
  },
  body: JSON.stringify({
    monthId: 'month-uuid-202607',
    meals: [{ memberId: 'admin-uuid-0000', date: '2026-07-23', lunch: 4.5, dinner: 2 }]
  })
}).then(r => r.json()).then(console.log).catch(console.error);
