import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mergeImport, recommend, trajectory, eligible, completeActivity } from '../lib/domain.js';
import { datasetFromFiles, reconcileProgress } from '../lib/dataset.js';
import { loadDatasetDirectory } from '../lib/dataset-loader.js';

function fixture() {
  const meta = { dataset: 'Career Quest', version: '1.0', as_of_date: '2026-10-01' };
  return {
    employees: { meta, employees: [{ employee_id: 'E1', full_name: 'Synthetic Person', role: 'Engineer', grade: 'Middle', tenure_months: 24, skills: { SK_A: 1, SK_B: 0 }, career_goal: null, last_review_date: '2026-07-01' }] },
    skills: { meta, proficiency_scale: { 0: 'None', 5: 'Expert' }, skills: [{ skill_id: 'SK_A', name: 'Architecture' }, { skill_id: 'SK_B', name: 'Communication' }], role_profiles: [
      { role: 'Engineer', grade: 'Middle', required_skills: { SK_A: 1 }, critical_skills: ['SK_A'] },
      { role: 'Engineer', grade: 'Senior', required_skills: { SK_A: 4, SK_B: 2 }, critical_skills: ['SK_A'] },
      { role: 'Designer', grade: 'Middle', required_skills: { SK_B: 3 }, critical_skills: ['SK_B'] },
    ] },
    events: { meta, events: [
      { event_id: 'EV_A', title: 'Architecture basics', type: 'course', format: 'self_paced', mandatory: false, target_roles: ['Engineer'], target_grades: ['Middle'], duration_hours: 2, develops_skills: [{ skill_id: 'SK_A', gain: 1, max_level: 3 }], prerequisites: {}, upcoming_sessions: [] },
      { event_id: 'EV_B', title: 'Advanced architecture', type: 'workshop', format: 'online', mandatory: false, target_roles: ['Engineer'], target_grades: ['Middle'], duration_hours: 2, develops_skills: [{ skill_id: 'SK_A', gain: 1, max_level: 5 }], prerequisites: { SK_A: 3 }, upcoming_sessions: ['2026-10-05'] },
      { event_id: 'EV_036', title: 'Speaking club', type: 'meetup', format: 'offline', mandatory: false, target_roles: ['Engineer'], target_grades: ['Middle'], duration_hours: 1, develops_skills: [{ skill_id: 'SK_B', gain: 1, max_level: 4 }], prerequisites: {}, upcoming_sessions: ['2026-10-08', '2026-10-22'] },
      { event_id: 'EV_M', title: 'Mandatory compliance', type: 'compliance', format: 'self_paced', mandatory: true, target_roles: ['Engineer'], target_grades: ['Middle'], duration_hours: 2, develops_skills: [], prerequisites: {}, upcoming_sessions: [] },
    ] },
    history: [
      { record_id: 'R1', employee_id: 'E1', event_id: 'EV_036', date: '2026-06-01', status: 'completed', completion_pct: '100', score: '', feedback_rating: '4' },
      { record_id: 'R2', employee_id: 'E1', event_id: 'EV_A', date: '2026-08-01', status: 'completed', completion_pct: '100', score: '80', feedback_rating: '' },
      { record_id: 'R3', employee_id: 'E1', event_id: 'EV_036', date: '2026-09-01', status: 'completed', completion_pct: '100', score: '', feedback_rating: '5' },
    ],
  };
}
const empty = () => ({ employees: [], events: [], skills: [], history: [], enrollments: [] });
test('starter wrappers preserve role requirements and apply only post-review gains once', () => {
  const state = mergeImport(empty(), fixture()); const employee = state.employees[0];
  assert.equal(employee.name, 'Synthetic Person'); assert.equal(state.meta.as_of_date, '2026-10-01');
  assert.equal(state.role_profiles.length, 3); assert.equal(employee.skills.SK_A, 2); assert.equal(employee.skills.SK_B, 1);
  assert.deepEqual(employee.assessed_skills, { SK_A: 1, SK_B: 0 }); assert.deepEqual(employee.applied_history_ids, ['R2', 'R3']);
  assert.equal(state.history[0].on_time, null); assert.equal(state.history[1].score, 80);
  assert.equal(trajectory(state, employee).skills.find(s => s.skill_id === 'SK_A').target, 4);
  assert.equal(trajectory(state, employee).skills.find(s => s.skill_id === 'SK_A').critical, true);
  assert.deepEqual(mergeImport(state, fixture()).employees[0].skills, employee.skills);
  assert.deepEqual(mergeImport(state, state).employees[0].skills, employee.skills);
});
test('eligibility respects prerequisites, mandatory events, caps and future availability', () => {
  const state = mergeImport(empty(), fixture()), employee = state.employees[0];
  assert.equal(eligible(state.events[1], employee, state), false);
  assert.equal(eligible(state.events[3], employee, state), false);
  assert.deepEqual(recommend(state, employee).map(e => e.event_id), ['EV_036']);
  employee.skills.SK_A = 3; assert.equal(eligible(state.events[1], employee, state), true);
  state.events[1].upcoming_sessions = ['2026-09-01']; assert.equal(eligible(state.events[1], employee, state), false);
});
test('career changes use target role requirements while audience eligibility stays enforced', () => {
  const state = mergeImport(empty(), fixture()), employee = state.employees[0];
  employee.career_goal = { target_role: 'Designer', target_grade: 'Middle' };
  const path = trajectory(state, employee);
  assert.equal(path.target_role, 'Designer'); assert.equal(path.next_grade, 'Middle');
  assert.equal(path.skills.find(s => s.skill_id === 'SK_B').target, 3);
  assert.equal(path.skills.find(s => s.skill_id === 'SK_A').target, 0);
});
test('recurring sessions can grant gains once per enrollment/session', () => {
  const state = mergeImport(empty(), fixture()), employee = state.employees[0];
  const join = session_date => state.enrollments.push({ employee_id: 'E1', event_id: 'EV_036', session_date });
  join('2026-10-08'); completeActivity(state, employee, 'EV_036'); assert.equal(employee.skills.SK_B, 2);
  assert.throws(() => completeActivity(state, employee, 'EV_036'), /Join/);
  join('2026-10-08'); assert.throws(() => completeActivity(state, employee, 'EV_036'), /session/); assert.equal(employee.skills.SK_B, 2);
  state.enrollments = []; join('2026-10-22'); completeActivity(state, employee, 'EV_036'); assert.equal(employee.skills.SK_B, 3);
  reconcileProgress(state); assert.equal(employee.skills.SK_B, 3);
});
test('skills.json file adapter retains role_profiles; invalid metadata and history fail atomically', () => {
  const raw = fixture();
  const parsed = datasetFromFiles([{ name: 'skills.json', parsed: raw.skills }]);
  assert.equal(parsed.role_profiles.length, 3); assert.ok(parsed.proficiency_scale);
  const state = mergeImport(empty(), raw);
  const invalid = fixture(); invalid.events.meta = { ...invalid.events.meta, as_of_date: '2027-01-01' };
  assert.throws(() => mergeImport(state, invalid), /snapshot/);
  assert.throws(() => mergeImport(state, { history: [{ ...raw.history[0], record_id: 'NEW', score: 'not-a-number' }] }), /score/);
  assert.equal(state.history.length, 3);
});
test('supplied archive data loads at full scale and remains idempotent', { skip: !existsSync('data/source/employees.json') }, () => {
  const state = loadDatasetDirectory('data/source');
  assert.equal(state.employees.length, 200); assert.equal(state.events.length, 40); assert.equal(state.skills.length, 60); assert.equal(state.history.length, 2743); assert.equal(state.role_profiles.length, 32);
  assert.equal(state.meta.as_of_date, '2026-10-01');
  assert.equal(state.employees.find(e => e.employee_id === 'E0028').name, 'Akmaral Ismailova');
  const copy = mergeImport(state, state);
  assert.deepEqual(copy.employees.map(e => e.skills), state.employees.map(e => e.skills));
  for (const employee of state.employees) {
    for (const event of recommend(state, employee)) {
      assert.equal(event.mandatory, false);
      assert.ok(Object.entries(event.prerequisites).every(([id, level]) => (employee.skills[id] || 0) >= level));
    }
  }
});
