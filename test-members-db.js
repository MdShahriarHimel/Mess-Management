const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./server/db/database_backup.json', 'utf8'));
console.log(db.members.map(m => m.id));
