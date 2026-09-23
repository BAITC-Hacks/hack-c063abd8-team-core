import { createHash } from 'node:crypto';
import { asOf } from './dataset.js';
import { trajectory, eligible, remainingSessions, skillChanges, validateState } from './domain.js';

const SOURCE = 'catalog-repair-v1';
const practiceSteps = [
  'Explain the core concepts in your own words and work through one simple example.',
  'Solve a small independent task and document your approach and expected result.',
  'Complete a realistic task, test the result and explain how you handled mistakes.',
  'Compare two approaches to a complex case and justify your choice, trade-offs and checks.',
  'Design a solution to a complex case, define review criteria and document limitations and improvements.',
];
const belongs = (event, employee) => event.voluntary !== false && event.mandatory !== true &&
  (!event.audience.length || event.audience.includes('all') || event.audience.includes(employee.role)) &&
  (!event.grades?.length || event.grades.includes(employee.grade));
const done = (event, employee, state) => !event.recurring && state.history.some(h => h.employee_id === employee.employee_id && h.event_id === event.event_id && h.status === 'completed');
const improves = (event, employee, targets) => skillChanges(event, employee).reduce((sum, c) => sum + Math.max(0, Math.min(c.after, targets.get(c.skill_id) || 0) - Math.min(c.before, targets.get(c.skill_id) || 0)), 0);

export function auditCatalog(state) {
  let employeesWithGaps = 0, withoutRecommendations = 0, aboveCatalogCap = 0;
  const uncovered = new Map();
  for (const employee of state.employees) {
    const gaps = trajectory(state, employee).skills.filter(s => s.target > s.current);
    if (!gaps.length) continue;
    employeesWithGaps++;
    const targets = new Map(gaps.map(s => [s.skill_id, s.target]));
    const applicable = state.events.filter(e => belongs(e, employee));
    if (!applicable.some(e => !done(e, employee, state) && eligible(e, employee, state) && improves(e, employee, targets) > 0)) withoutRecommendations++;
    let capped = false;
    for (const gap of gaps) {
      const gains = applicable.flatMap(e => e.skills.filter(g => g.skill_id === gap.skill_id));
      if (!gains.length) uncovered.set(gap.skill_id, { skill_id: gap.skill_id, name: gap.name, requirements: (uncovered.get(gap.skill_id)?.requirements || 0) + 1 });
      if (Math.max(gap.current, ...gains.map(g => g.max_level)) < gap.target) capped = true;
    }
    if (capped) aboveCatalogCap++;
  }
  return { employees_with_gaps: employeesWithGaps, without_recommendations: withoutRecommendations,
    above_catalog_cap: aboveCatalogCap, uncovered_skills: [...uncovered.values()] };
}

function reasonFor(state, employee, skillId, level) {
  const courses = state.events.filter(e => !e.auto_generated && belongs(e, employee) && e.skills.some(g => g.skill_id === skillId));
  if (!courses.length) return 'missing_skill';
  const capable = courses.filter(e => e.skills.some(g => g.skill_id === skillId && g.max_level >= level));
  if (!capable.length) return 'catalog_cap';
  const uncompleted = capable.filter(e => !done(e, employee, state));
  if (!uncompleted.length) return 'completed_courses';
  if (uncompleted.every(e => Object.entries(e.prerequisites || {}).some(([id, required]) => (employee.skills[id] || 0) < required))) return 'prerequisites';
  return 'unavailable_sessions';
}

// Planning uses a simulated profile. Only new activities are added to the real state.
// Each activity is an explicit self-study task, never a fabricated provider course.
export function repairCatalog(state) {
  const added = [];
  for (const original of state.employees) {
    const employee = { ...original, skills: { ...original.skills } };
    const targets = new Map(trajectory(state, employee).skills.filter(s => s.target > s.current).map(s => [s.skill_id, s.target]));
    const simulated = { ...state, history: state.history.filter(h => h.employee_id === employee.employee_id), enrollments: (state.enrollments || []).filter(e => e.employee_id === employee.employee_id) };
    const budget = [...targets].reduce((sum, [id, level]) => sum + level - (employee.skills[id] || 0), 0);
    for (let step = 0; step < budget; step++) {
      const gaps = [...targets].filter(([id, level]) => (employee.skills[id] || 0) < level);
      if (!gaps.length) break;
      let event = state.events.filter(e => !done(e, employee, simulated) && eligible(e, employee, simulated) && improves(e, employee, targets) > 0)
        .sort((a, b) => Number(Boolean(a.auto_generated)) - Number(Boolean(b.auto_generated)) || improves(b, employee, targets) - improves(a, employee, targets) || a.event_id.localeCompare(b.event_id))[0];
      if (!event) {
        const [skillId] = gaps[0], level = (employee.skills[skillId] || 0) + 1;
        const skill = state.skills.find(s => s.skill_id === skillId);
        const identity = JSON.stringify([employee.role, employee.grade, skillId, level]);
        const prefix = `AUTO_${createHash('sha256').update(identity).digest('hex').slice(0, 24)}`;
        let attempt = 1, eventId = prefix;
        // Never overwrite an imported ID or recycle an already completed task.
        while (state.events.some(e => e.event_id === eventId)) eventId = `${prefix}_${++attempt}`;
        event = {
          event_id: eventId, title: `Guided practice: ${skill.name} · level ${level}`,
          description: practiceSteps[level - 1], type: 'lab', format: 'self_paced',
          duration_hours: [1, 2, 3, 4, 6][level - 1], voluntary: true, mandatory: false, recurring: false,
          audience: [employee.role], grades: [employee.grade], prerequisites: level > 1 ? { [skillId]: level - 1 } : {},
          skills: [{ skill_id: skillId, gain: 1, max_level: level }], upcoming_sessions: [],
          auto_generated: { source: SOURCE, skill_id: skillId, from_level: level - 1, to_level: level, reason: reasonFor(simulated, employee, skillId, level) },
        };
        state.events.push(event); added.push(eventId);
      }
      for (const change of skillChanges(event, employee)) employee.skills[change.skill_id] = change.after;
      const sessionDate = remainingSessions(event, employee, simulated)[0];
      simulated.history.push({ employee_id: employee.employee_id, event_id: event.event_id, status: 'completed', date: asOf(state), session_date: sessionDate });
      simulated.enrollments = simulated.enrollments.filter(e => e.event_id !== event.event_id);
    }
  }
  validateState(state);
  return { added };
}

export function catalogHealth(state) {
  return { original: auditCatalog({ ...state, events: state.events.filter(e => !e.auto_generated) }), current: auditCatalog(state),
    generated_activities: state.events.filter(e => e.auto_generated?.source === SOURCE).length };
}
