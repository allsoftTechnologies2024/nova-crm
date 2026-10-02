// Enforces the module boundary between the workspace CRM and the platform-admin console.
//   - Platform code (src/platform, src/app/admin, src/app/api/admin) MAY import workspace modules: it manages them.
//   - Workspace code MUST NOT import platform code. The only exception is src/proxy.ts, the gate for both.
// Run: npm run check:boundaries   (exits 1 on violations)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const isPlatform = (f) => /^(platform|app\/admin|app\/api\/admin)\//.test(f);
const ALLOWED = new Set(['proxy.ts']);

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) files.push(path.relative(ROOT, p).split(path.sep).join('/'));
  }
})(ROOT);

const violations = [];
for (const f of files) {
  if (isPlatform(f) || ALLOWED.has(f)) continue;
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of src.matchAll(/from\s+['"](@\/(platform|app\/admin|app\/api\/admin)[^'"]*)['"]/g)) violations.push(`${f} → ${m[1]}`);
}

if (violations.length) {
  console.error(`✗ Workspace code imports platform code (${violations.length}):\n  ${violations.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ Module boundary OK (${files.length} files; workspace never imports platform)`);
