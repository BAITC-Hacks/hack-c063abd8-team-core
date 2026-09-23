import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { repairCatalog, catalogHealth } from '../lib/catalog-repair.js';
import { loadDatasetDirectory } from '../lib/dataset-loader.js';
import { recommend, trajectory, completeActivity, eligible, mergeImport, exportBackup, restoreBackup } from '../lib/domain.js';
import { translateText } from '../public/i18n.js';

function fixture(reason) {
  const event = { event_id: 'COURSE', title: 'Original course', description: '', type: 'course', format: 'self_paced', audience: ['Engineer'], grades: ['Middle'], voluntary: true, duration_hours: 1, prerequisites: {}, skills: [{ skill_id: 'SK_TEST', gain: 1, max_level: 5 }] };
  if (reason === 'missing_skill') { event.voluntary = false; event.skills = []; }
  if (reason === 'catalog_cap') event.skills[0].max_level = 1;
  if (reason === 'prerequisites') event.prerequisites = { SK_OTHER: 3 };
  if (reason === 'unavailable_sessions') { event.format = 'online'; event.upcoming_sessions = ['2025-01-01']; }
  return { meta: { as_of_date: '2026-10-01' },
    employees: [{ employee_id: 'E1', name: 'Test', role: 'Engineer', grade: 'Middle', tenure_months: 1, skills: { SK_TEST: 1, SK_OTHER: 0 } }],
    skills: [{ skill_id: 'SK_TEST', name: 'Test Design', requirements: { Senior: 5 } }, { skill_id: 'SK_OTHER', name: 'Other', requirements: {} }],
    events: [event], enrollments: [], withdrawn_enrollments: [],
    history: reason === 'completed_courses' ? [{ history_id: 'H1', employee_id: 'E1', event_id: 'COURSE', status: 'completed', date: '2026-09-01', on_time: true }] : [],
  };
}
for (const reason of ['missing_skill', 'catalog_cap', 'completed_courses', 'prerequisites', 'unavailable_sessions']) {
  test(`catalog repair provides a complete path for ${reason} without altering assessments`, () => {
    const state = fixture(reason), original = structuredClone(state);
    const result = repairCatalog(state);
    assert.equal(result.added.length, 4);
    assert.deepEqual(state.employees, original.employees);
    assert.deepEqual(state.history, original.history);
    assert.deepEqual(state.events[0], original.events[0]);
    assert.equal(state.events[1].auto_generated.reason, reason);
    assert.equal(eligible(state.events.at(-1), state.employees[0], state), false, 'Higher levels must require prior practice');
    const serialized = JSON.stringify(state);
    assert.deepEqual(repairCatalog(state).added, []);
    assert.equal(JSON.stringify(state), serialized);
    for (let level = 2; level <= 5; level++) {
      const [next] = recommend(state, state.employees[0]);
      assert.ok(next);
      state.enrollments.push({ employee_id: 'E1', event_id: next.event_id });
      completeActivity(state, state.employees[0], next.event_id);
      assert.equal(state.employees[0].skills.SK_TEST, level);
      assert.deepEqual(repairCatalog(state).added, []);
    }
    assert.equal(trajectory(state, state.employees[0]).gap_count, 0);
    assert.equal(recommend(state, state.employees[0]).length, 0);
    assert.equal(state.history.length, original.history.length + 4);
    assert.deepEqual(restoreBackup(exportBackup(state)), state);
    assert.deepEqual(repairCatalog(mergeImport(state, state)).added, []);
  });
}

test('complete supplied dataset has no gaps without a next step after automatic supplementation', { skip: !existsSync('data/source/employees.json') }, () => {
  const state = loadDatasetDirectory('data/source');
  const original = structuredClone(state);
  assert.equal(catalogHealth(state).current.without_recommendations, 30);
  repairCatalog(state);
  const health = catalogHealth(state);
  assert.equal(health.current.employees_with_gaps, 190);
  assert.equal(health.current.without_recommendations, 0);
  assert.equal(health.current.above_catalog_cap, 0);
  assert.deepEqual(health.current.uncovered_skills, []);
  assert.deepEqual(state.employees, original.employees);
  assert.deepEqual(state.history, original.history);
  assert.deepEqual(state.events.slice(0, original.events.length), original.events);
  for (const employee of state.employees) if (trajectory(state, employee).gap_count) assert.ok(recommend(state, employee).length, employee.employee_id);
  const generated = state.events.filter(e => e.auto_generated);
  for (const event of generated) for (const lang of ['ru', 'kk']) {
    assert.notEqual(translateText(event.title, lang), event.title);
    assert.notEqual(translateText(event.description, lang), event.description);
  }
  assert.equal(repairCatalog(state).added.length, 0);
});

test('repair adapts to changed roles and never overwrites colliding imported IDs', () => {
  const state = fixture('missing_skill'); repairCatalog(state);
  const event = state.events[1]; delete event.auto_generated; event.audience = ['Someone else'];
  assert.ok(repairCatalog(state).added.length > 0);
  assert.deepEqual(state.events.find(e => e.event_id === event.event_id).audience, ['Someone else']);
  state.employees[0].role = 'New role';
  assert.ok(repairCatalog(state).added.length > 0);
  assert.ok(recommend(state, state.employees[0]).every(e => e.audience.includes('New role')));
});
