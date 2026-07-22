const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf8');

// replace occurrences of "dbCache = {" with "dbCache = { ... }; postgresSnapshot = JSON.parse(JSON.stringify(dbCache));" 
// Wait, initializeDbCache does:
// dbCache = {
//   members: membersList as any[],
// ...
// };
code = code.replace(
  /dbCache = \{\s*members: membersList[\s\S]*?mealRequests: mealRequestsList as any\[\],\s*\};/g,
  (match) => {
    return match + "\n  postgresSnapshot = JSON.parse(JSON.stringify(dbCache));";
  }
);

// ensureMonthDataLoaded does:
// dbCache.meals.push(...(mList as any[]));
// Let's just update the snapshot at the end of ensureMonthDataLoaded
code = code.replace(
  /loadedMonthIds\.add\(monthId\);/g,
  "loadedMonthIds.add(monthId);\n    postgresSnapshot = JSON.parse(JSON.stringify(dbCache));"
);

// Wait, unload memory does:
// loadedMonthIds.delete(loadedId);
code = code.replace(
  /loadedMonthIds\.delete\(loadedId\);\n\s*break;/g,
  "loadedMonthIds.delete(loadedId);\n          postgresSnapshot = JSON.parse(JSON.stringify(dbCache));\n          break;"
);

fs.writeFileSync('server/db.ts', code);
console.log("Patched snapshot init!");
