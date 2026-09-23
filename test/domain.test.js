import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../lib/seed.js';
import { recommend, trajectory, completeActivity, skillChanges, mergeImport, parseCsv, validateState, hrSummary } from '../lib/domain.js';
import { aiRecommendations } from '../lib/ai.js';

test('seed has requested scale and validates', () => {
  const state = createSeed(); validateState(state);
  assert.equal(state.employees.length, 200); assert.equal(state.events.length, 40); assert.equal(state.skills.length, 60);
  assert.ok(state.history.length > 3000);
});
test('critical grade gap outranks lowest skill with repeated no-shows', () => {
  const state = createSeed(), employee = state.employees.find(e => e.employee_id === 'E0028');
  const result = recommend(state, employee);
  assert.equal(result[0].event_id, 'EV001');
  assert.ok(result[0].evidence.some(e => e.includes('2/4')));
  assert.ok(result[0].evidence.some(e => e.includes('last two')));
  assert.ok(result.findIndex(e => e.event_id === 'EV003') > 0);
  assert.ok(!result.some(e => ['EV002', 'EV005'].includes(e.event_id)));
});
test('role audience, grade and caps override a large apparent skill gap', () => {
  const state = createSeed(), employee = state.employees[27];
  state.events.find(e => e.event_id === 'EV001').audience = ['Designer'];
  assert.ok(!recommend(state, employee).some(e => e.event_id === 'EV001'));
  state.events.find(e => e.event_id === 'EV004').skills[0].max_level = 1;
  assert.ok(!recommend(state, employee).some(e => e.event_id === 'EV004'));
});
test('completion changes readiness, honors cap and cannot be replayed', () => {
  const state = createSeed(), employee = state.employees[27];
  const before = trajectory(state, employee).readiness;
  assert.throws(() => completeActivity(state, employee, 'EV001'), /Join/);
  state.enrollments.push({ employee_id: employee.employee_id, event_id: 'EV001' });
  const changes = completeActivity(state, employee, 'EV001');
  assert.equal(changes[0].after, 3); assert.equal(employee.skills.SK_SYSTEM_DESIGN, 3);
  assert.ok(trajectory(state, employee).readiness > before);
  assert.equal(state.enrollments.length, 0);
  assert.throws(() => completeActivity(state, employee, 'EV001'), /already/);
  const event = { skills: [{ skill_id: 'SK_SYSTEM_DESIGN', gain: 4, max_level: 4 }] };
  assert.equal(skillChanges(event, employee)[0].after, 4);
  employee.skills.SK_SYSTEM_DESIGN = 5;
  assert.equal(skillChanges(event, employee)[0].after, 5);
});
test('history preference changes order of otherwise equivalent opportunities', () => {
  const state = createSeed(), employee = state.employees[27];
  const workshop = state.events[0];
  state.events.push({ ...structuredClone(workshop), event_id: 'EV_ALTERNATIVE', type: 'mentoring' });
  state.history.push(...Array.from({ length: 4 }, (_, i) => ({ employee_id: employee.employee_id, event_id: 'EV004', status: 'completed', date: `2026-08-${20 + i}`, on_time: true })));
  assert.equal(recommend(state, employee)[0].event_id, 'EV_ALTERNATIVE');
});
test('CSV accepts CRLF, quoted commas, newlines, escaped quotes and BOM', () => {
  assert.deepEqual(parseCsv('\uFEFFa,b\r\n"one,two","a""b"\r\n"line\nbreak",c\r\n'), [{ a: 'one,two', b: 'a"b' }, { a: 'line\nbreak', b: 'c' }]);
  assert.throws(() => parseCsv('a,b\n1'), /fields/);
  assert.throws(() => parseCsv('a,b\n"x,y'), /unclosed/);
});
test('jury upload merges profiles with history atomically and idempotently', () => {
  const state = createSeed();
  const payload = { employees: [{ ...state.employees[27], employee_id: 'JURY01' }], history: [{ employee_id: 'JURY01', event_id: 'EV003', status: 'no_show', date: '2026-08-01', on_time: 'false' }] };
  const next = mergeImport(state, payload);
  assert.equal(next.employees.length, 201); assert.equal(state.employees.length, 200);
  assert.equal(next.history.filter(h => h.employee_id === 'JURY01').length, 1);
  assert.equal(mergeImport(next, payload).history.length, next.history.length);
  assert.equal(recommend(next, next.employees.find(e => e.employee_id === 'JURY01'))[0].event_id, 'EV001');
  assert.throws(() => mergeImport(state, { employees: [{ ...state.employees[0], skills: { INVALID: 9 } }] }), /unknown skill/);
  assert.throws(() => mergeImport(state, { history: [{ ...payload.history[0], on_time: 'maybe' }] }), /on_time/);
  assert.equal(state.employees.length, 200);
});
test('role-specific requirements include absent required skills and top grade has no invented target', () => {
  const state = createSeed(), employee = state.employees[27];
  state.skills[6].requirements = { 'Backend Engineer': { Senior: 4 } };
  assert.ok(trajectory(state, employee).skills.some(s => s.skill_id === state.skills[6].skill_id && s.current === 0 && s.target === 4));
  employee.grade = 'Lead'; assert.equal(trajectory(state, employee).readiness, null); assert.equal(recommend(state, employee).length, 0);
});
test('HR flags inactivity and repeated skips as support signals', () => {
  const state = createSeed();
  state.history.push({ employee_id: 'E0028', event_id: 'EV003', status: 'no_show', date: '2026-09-01', on_time: false });
  const result = hrSummary(state, Date.parse('2026-09-23'));
  assert.equal(result.total, 200); assert.ok(result.gaps.length);
  assert.ok(result.people.find(p => p.employee_id === 'E0028').needs_support);
});
test('local AI selects only eligible IDs and falls back on malformed output', async () => {
  const previous = process.env.OLLAMA_MODEL, previousUrl = process.env.OLLAMA_URL, previousProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = 'ollama';
  process.env.OLLAMA_MODEL = 'test-model'; process.env.OLLAMA_URL = 'http://127.0.0.1:11434';
  const state = createSeed(), employee = state.employees[27], candidates = recommend(state, employee);
  try {
    const valid = await aiRecommendations(employee, candidates, async () => ({ ok: true, json: async () => ({ message: { content: JSON.stringify({ recommendations: [{ event_id: 'EV001', rationale: 'Closes the critical system design gap while accounting for attendance.' }] }) } }) }));
    assert.equal(valid.mode, 'local_ai'); assert.equal(valid.recommendations[0].event_id, 'EV001');
    const invalid = await aiRecommendations(employee, candidates, async () => ({ ok: true, json: async () => ({ message: { content: '{"recommendations":[{"event_id":"MADE_UP","rationale":"Oops"}]}' } }) }));
    assert.equal(invalid.mode, 'rules');
    process.env.OLLAMA_URL = 'https://external.example';
    const forbidden = await aiRecommendations(employee, candidates, async () => { throw new Error('Must not fetch'); });
    assert.equal(forbidden.mode, 'rules');
  } finally {
    if (previousProvider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = previousProvider;
    if (previous === undefined) delete process.env.OLLAMA_MODEL; else process.env.OLLAMA_MODEL = previous;
    if (previousUrl === undefined) delete process.env.OLLAMA_URL; else process.env.OLLAMA_URL = previousUrl;
  }
});
