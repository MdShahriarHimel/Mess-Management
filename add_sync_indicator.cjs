const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('import { SyncIndicator }')) {
  code = code.replace(/import React/, 'import { SyncIndicator } from "./components/SyncIndicator";\nimport React');
}

const syncIndicatorJSX = `
          <div className="flex justify-between items-center text-xs">
            <span className="text-[10px] text-slate-500">Cloud Sync</span>
            <SyncIndicator />
          </div>
`;

if (!code.includes('<SyncIndicator />')) {
  code = code.replace(/<span className="text-\[10px\] text-slate-500">Theme<\/span>/, syncIndicatorJSX.trim() + '\n          </div>\n          <div className="flex justify-between items-center text-xs">\n            <span className="text-[10px] text-slate-500">Theme</span>');
}

fs.writeFileSync('src/App.tsx', code);
console.log('done sync indicator');
