const crypto = require('crypto');
function hashObj(obj) {
  return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
}
console.log(hashObj({a: 1}));
