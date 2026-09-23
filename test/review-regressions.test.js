import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../lib/seed.js';
import { mergeImport, parseCsv, eligible, remainingSessions, recommend, exportBackup, restoreBackup } from '../lib/domain.js';

function fixture() {
  const state = createSeed();
  state.meta = { as_of_date: '2026-10-01' };
  state.history = [];
  const employee = state.employees[27];
  employee.last_review_date = '2026-01-01';
  employee.assessed_skills = { ...employee.skills, SK_SYSTEM_DESIGN: 1 };
  employee.skills = { ...employee.assessed_skills };
  return state;
}
const completion = (history_id, date = '2026-09-01', extra = {}) => ({ history_id, employee_id: 'E0028', event_id: 'EV001', status: 'completed', on_time: null, date, ...extra });

test('duplicate completions retain audit rows but earn credit only once, including across review dates', () => {
  const state = fixture();
  const next = mergeImport(state, { history: [completion('one'), completion('two')] });
  assert.equal(next.employees[27].skills.SK_SYSTEM_DESIGN, 2);
  assert.equal(next.history.length, 2);
  assert.deepEqual(next.employees[27].applied_history_ids, ['one']);
  assert.equal(mergeImport(next, next).employees[27].skills.SK_SYSTEM_DESIGN, 2);
  assert.equal(state.employees[27].skills.SK_SYSTEM_DESIGN, 1);
  const beforeReview = mergeImport(state, { history: [completion('one', '2025-12-01'), completion('two')] });
  assert.equal(beforeReview.employees[27].skills.SK_SYSTEM_DESIGN, 1);
});

test('recurring credit and availability share session identity, including legacy history dates', () => {
  const state = fixture(), event = state.events[0], employee = state.employees[27];
  event.recurring = true; event.format = 'online'; event.upcoming_sessions = ['2026-10-02', '2026-10-03'];
  const next = mergeImport(state, { history: [completion('one', '2026-09-01'), completion('two', '2026-09-02', { session_date: '2026-09-01' }), completion('three', '2026-09-03')] });
  assert.equal(next.employees[27].skills.SK_SYSTEM_DESIGN, 3);
  state.history = [completion('one', '2026-10-02'), completion('two', '2026-10-01', { session_date: '2026-10-03' })];
  assert.deepEqual(remainingSessions(event, employee, state), []);
  assert.equal(eligible(event, employee, state), false);
  assert.ok(!recommend(state, employee).some(e => e.event_id === event.event_id));
});

test('backup restores levels, manual plans and withdrawals into an independent state without replay', () => {
  const state = fixture();
  state.enrollments = [{ employee_id: 'E0028', event_id: 'EV001', date: '2026-10-01' }];
  state.withdrawn_enrollments = ['E0028:EV003'];
  state.history = [{ ...completion('progress'), event_id: 'EV003', status: 'in_progress' }];
  state.employees[27].skills.SK_SYSTEM_DESIGN = 4;
  const saved = JSON.parse(JSON.stringify(exportBackup(state)));
  const restored = restoreBackup(saved);
  assert.deepEqual(restored, state);
  assert.notEqual(restored, saved.state);
  saved.state.enrollments.push({ employee_id: 'OTHER', event_id: 'EV001' });
  assert.throws(() => restoreBackup(saved), /reference/);
  assert.equal(restored.enrollments.length, 1);
});

test('CSV normalizes headers before checking duplicates and rejects blank headers', () => {
  assert.throws(() => parseCsv('employee_id, employee_id\nE1,E2'), /duplicate/);
  assert.throws(() => parseCsv('employee_id, \nE1,E2'), /empty column/);
  assert.deepEqual(parseCsv(' employee_id , event_id \nE1,EV1'), [{ employee_id: 'E1', event_id: 'EV1' }]);
});

test('event boolean fields reject strings instead of coercing false to true', () => {
  const state = fixture();
  for (const field of ['mandatory', 'voluntary', 'recurring']) {
    assert.throws(() => mergeImport(state, { events: [{ ...state.events[0], [field]: 'false' }] }), /boolean/);
  }
});
