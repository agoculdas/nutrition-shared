import fs from 'node:fs';
import path from 'node:path';

const planPaths = [path.resolve('docs/PLAN-india-upgrade-ecss.md'), path.resolve('docs/PLAN-meal-prep-annex.md'), path.resolve('docs/PLAN-fast-log.md')];
const vcdPath = path.resolve('docs/requirements/vcd.json');
const requirements = [];
for (const planPath of planPaths) {
  const lines = fs.readFileSync(planPath, 'utf8').split(/\r?\n/);
  let checkpoint = null;
  for (const line of lines) {
    const checkpointMatch = line.match(/^### Checkpoint (CP\w+|CDR)/);
    if (checkpointMatch) checkpoint = checkpointMatch[1];
    const match = line.match(/^\| `([A-Z]{2,3}-\d{3})` \| (.*?) \| `(MO-\d{2})` \| `(T|A|RoD|I)` \| (.*?) \|$/);
    if (match) requirements.push({ id: match[1], requirement: match[2], objective: match[3], method: match[4], passCriterion: match[5], checkpoint });
  }
}

const errors = [];
const ids = requirements.map(item => item.id);
for (const item of requirements) {
  const shall = item.requirement.match(/\bshall\b/gi) || [];
  if (shall.length !== 1) errors.push(`${item.id}: expected one shall, found ${shall.length}`);
  if (/\b(TBD|TBC|should|may|must)\b/i.test(item.requirement)) errors.push(`${item.id}: forbidden normative term`);
  if (!item.objective || !item.method || !item.passCriterion || !item.checkpoint) errors.push(`${item.id}: missing trace field`);
}
for (const id of new Set(ids)) if (ids.filter(candidate => candidate === id).length !== 1) errors.push(`${id}: duplicate identifier`);

if (process.argv.includes('--init')) {
  fs.mkdirSync(path.dirname(vcdPath), { recursive: true });
  const vcd = requirements.map(item => ({
    id: item.id,
    objective: item.objective,
    checkpoint: item.checkpoint,
    method: item.method,
    status: 'Not run',
    evidencePath: '',
    result: '',
    verifier: '',
    verificationDate: '',
  }));
  fs.writeFileSync(vcdPath, JSON.stringify(vcd, null, 2) + '\n');
}

if (!fs.existsSync(vcdPath)) errors.push('VCD is missing; run with --init once.');
else {
  const vcd = JSON.parse(fs.readFileSync(vcdPath, 'utf8'));
  if (process.argv.includes('--sync-structure')) {
    const requirementsById = new Map(requirements.map(item => [item.id, item]));
    for (const entry of vcd) {
      const requirement = requirementsById.get(entry.id);
      if (requirement) Object.assign(entry, { objective: requirement.objective, checkpoint: requirement.checkpoint, method: requirement.method });
    }
    fs.writeFileSync(vcdPath, JSON.stringify(vcd, null, 2) + '\n');
  }
  const vcdIds = vcd.map(item => item.id);
  const missing = ids.filter(id => !vcdIds.includes(id));
  const extra = vcdIds.filter(id => !ids.includes(id));
  if (missing.length) errors.push(`VCD missing: ${missing.join(', ')}`);
  if (extra.length) errors.push(`VCD extra: ${extra.join(', ')}`);
  if (new Set(vcdIds).size !== vcdIds.length) errors.push('VCD contains duplicate identifiers.');
  const requirementsById = new Map(requirements.map(item => [item.id, item]));
  for (const entry of vcd) {
    const requirement = requirementsById.get(entry.id);
    if (requirement && (entry.objective !== requirement.objective || entry.checkpoint !== requirement.checkpoint || entry.method !== requirement.method)) {
      errors.push(`${entry.id}: VCD structure does not match the plan`);
    }
  }
}

const report = { ok: errors.length === 0, requirements: requirements.length, uniqueIds: new Set(ids).size, errors };
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
