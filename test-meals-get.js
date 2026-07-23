fetch('http://localhost:3000/api/meals/month-uuid-202607', {
  headers: {
    'Authorization': 'Bearer admin-uuid-0000'
  }
}).then(r => r.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(console.error);
