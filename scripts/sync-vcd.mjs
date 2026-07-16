import fs from 'node:fs';
import path from 'node:path';

const vcdPath = path.resolve('docs/requirements/vcd.json');
const recordsPath = path.resolve('docs/requirements/verification-records.json');
const vcd = JSON.parse(fs.readFileSync(vcdPath, 'utf8'));
const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
const allowed = new Set(['Not run', 'Pass', 'Fail', 'Blocked', 'Waived']);
const byId = new Map(vcd.map(entry => [entry.id, entry]));

for (const record of records) {
  const entry = byId.get(record.id);
  if (!entry) throw new Error(`Unknown verification identifier: ${record.id}`);
  if (!allowed.has(record.status)) throw new Error(`Invalid status for ${record.id}: ${record.status}`);
  Object.assign(entry, {
    status: record.status,
    evidencePath: record.evidencePath,
    result: record.result,
    verifier: record.verifier || 'Codex',
    verificationDate: record.verificationDate || '2026-07-16',
  });
}

fs.writeFileSync(vcdPath, JSON.stringify(vcd, null, 2) + '\n');
console.log(`Updated ${records.length} VCD entries.`);
