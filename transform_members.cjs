const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf-8');

// Find the members loop
const membersLoopRegex = /(for \(const item of cache\.members\) \{\n\s*await db\.insert\(membersTable\)\.values\(\{)([\s\S]*?)(\}\)\.onConflictDoUpdate\(\{[\s\S]*?\}\);\n\s*\})/g;

code = code.replace(membersLoopRegex, (match, start, inner, end) => {
  return `for (const item of cache.members) {
        const mapped = {${inner}};
        if (!isItemModified('members', item.id, mapped)) continue;
        await db.insert(membersTable).values(mapped).onConflictDoUpdate({
          target: membersTable.id,
          set: mapped
        });
      }`;
});

// Find the months loop
const monthsLoopRegex = /(for \(const item of cache\.months\) \{\n\s*await db\.insert\(monthsTable\)\.values\(\{)([\s\S]*?)(\}\)\.onConflictDoUpdate\(\{[\s\S]*?\}\);\n\s*\})/g;

code = code.replace(monthsLoopRegex, (match, start, inner, end) => {
  return `for (const item of cache.months) {
        const mapped = {${inner}};
        if (!isItemModified('months', item.id, mapped)) continue;
        await db.insert(monthsTable).values(mapped).onConflictDoUpdate({
          target: monthsTable.id,
          set: mapped
        });
      }`;
});

fs.writeFileSync('server/db.ts', code);
console.log('done members and months');
