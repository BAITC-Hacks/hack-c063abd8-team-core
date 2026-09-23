import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv, mergeImport } from './domain.js';
export function loadDatasetDirectory(directory) {
  const read = name => readFileSync(join(directory, name), 'utf8').replace(/^\uFEFF/, '');
  return mergeImport({ employees: [], events: [], skills: [], history: [], enrollments: [], version: 2 }, {
    employees: JSON.parse(read('employees.json')),
    events: JSON.parse(read('events.json')),
    skills: JSON.parse(read('skills.json')),
    history: parseCsv(read('activity_history.csv')),
  });
}
