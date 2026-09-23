import { copyFileSync, existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDatasetDirectory } from '../lib/dataset-loader.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] || resolve(root, 'data/source'));
const stateFile = process.env.STATE_FILE || resolve(root, 'data/state.json');
const state = loadDatasetDirectory(source);
// Stop the server before using this offline migration. Existing state is recoverable.
if (existsSync(stateFile)) {
  const backupDir = resolve(root, 'data/backups'); mkdirSync(backupDir, { recursive: true });
  const backupFile = resolve(backupDir, `state-${Date.now()}.json`);
  copyFileSync(stateFile, backupFile);
  console.log(`Previous state backed up to ${backupFile}`);
}
mkdirSync(dirname(stateFile), { recursive: true });
writeFileSync(`${stateFile}.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
renameSync(`${stateFile}.tmp`, stateFile);
console.log(JSON.stringify({ employees: state.employees.length, events: state.events.length, skills: state.skills.length, history: state.history.length, role_profiles: state.role_profiles.length, as_of_date: state.meta.as_of_date }));
