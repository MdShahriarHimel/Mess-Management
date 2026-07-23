const fs = require('fs');
let newContent = `
import crypto from 'crypto';

const lastSyncHashes = new Map();

function isItemModified(tableName, id, mappedItem) {
  if (!id) return true;
  const hashKey = tableName + ':' + id;
  const hash = crypto.createHash('md5').update(JSON.stringify(mappedItem)).digest('hex');
  if (lastSyncHashes.get(hashKey) !== hash) {
    lastSyncHashes.set(hashKey, hash);
    return true;
  }
  return false;
}
`;
console.log('done');
