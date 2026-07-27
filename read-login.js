const fs = require('fs');
const lines = fs.readFileSync('src/components/Login.tsx', 'utf8').split('\n');
console.log(lines.slice(270, 310).join('\n'));
