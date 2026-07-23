fetch('http://localhost:3000/api/members').then(r => r.json()).then(data => console.log(data.members.map(m => m.id))).catch(console.error);
