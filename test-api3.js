fetch('http://localhost:3000/api/meals', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer B846zoR80ueVCTDbAoN9mxJKyZL2'
  },
  body: JSON.stringify({
    monthId: 'month-uuid-202607',
    meals: [{ memberId: 'B846zoR80ueVCTDbAoN9mxJKyZL2', date: '2026-07-23', lunch: 100, dinner: 50 }]
  })
}).then(r => r.json()).then(console.log).catch(console.error);
