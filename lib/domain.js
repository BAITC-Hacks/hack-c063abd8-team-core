import { normalizeDataset, compileRequirements, reconcileProgress, asOf } from './dataset.js';
export const GRADES = ['Junior', 'Middle', 'Senior', 'Lead'];
export const nextGrade = employee => employee.career_goal?.target_grade || GRADES[GRADES.indexOf(employee.grade) + 1] || null;
export const targetRole = employee => employee.career_goal?.target_role || employee.role;
export function targetLevel(skill, employee) {
  const grade = nextGrade(employee);
  if (!grade) return 0;
  const role = targetRole(employee);
  if (!Object.hasOwn(employee.skills, skill.skill_id) && !skill.requirements?.[role]) return 0;
  return skill.requirements?.[role]?.[grade] ?? skill.requirements?.[grade] ?? 0;
}
export function trajectory(state, employee) {
  const skills = state.skills.filter(s => Object.hasOwn(employee.skills, s.skill_id) || s.requirements?.[targetRole(employee)]);
  const rows = skills.map(skill => ({ ...skill, current: employee.skills[skill.skill_id] || 0, target: targetLevel(skill, employee), critical: skill.critical_for?.[targetRole(employee)]?.includes(nextGrade(employee)) || false }));
  const total = rows.reduce((n, s) => n + s.target, 0);
  const met = rows.reduce((n, s) => n + Math.min(s.current, s.target), 0);
  return { next_grade: nextGrade(employee), target_role: targetRole(employee), explicit_goal: Boolean(employee.career_goal), readiness: total ? Math.round(met / total * 100) : null, skills: rows, gap_count: rows.filter(s => s.current < s.target).length, critical_gap_count: rows.filter(s => s.critical && s.current < s.target).length };
}
export function eligible(event, employee, state) {
  const prereqs = Object.entries(event.prerequisites || {}).every(([id, level]) => (employee.skills[id] || 0) >= level);
  const scheduled = !state || !event.format || event.format === 'self_paced' || event.upcoming_sessions?.some(d => d >= asOf(state).slice(0, 10));
  const alreadyJoined = state?.enrollments?.some(e => e.employee_id === employee.employee_id && e.event_id === event.event_id);
  return event.voluntary !== false && event.mandatory !== true && (!event.audience.length || event.audience.includes('all') || event.audience.includes(employee.role)) && (!event.grades?.length || event.grades.includes(employee.grade)) && prereqs && (scheduled || alreadyJoined);
}
export function skillChanges(event, employee) {
  return event.skills.map(g => {
    const before = employee.skills[g.skill_id] || 0;
    return { skill_id: g.skill_id, before, after: Math.max(before, Math.min(5, g.max_level, before + g.gain)), gain: g.gain, max_level: g.max_level };
  });
}
export function recommend(state, employee) {
  const path = trajectory(state, employee);
  const history = state.history.filter(h => h.employee_id === employee.employee_id);
  const lastTwo = history.filter(h => h.status === 'completed').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 2);
  return state.events.filter(e => eligible(e, employee, state)).map(event => {
    const changes = skillChanges(event, employee);
    const gaps = changes.map(c => {
      const skill = state.skills.find(s => s.skill_id === c.skill_id);
      const target = targetLevel(skill, employee);
      return { ...c, name: skill.name, target, critical: skill.critical_for?.[targetRole(employee)]?.includes(nextGrade(employee)) || false, closed: Math.max(0, Math.min(c.after, target) - Math.min(c.before, target)) };
    });
    const relevant = history.filter(h => {
      const past = state.events.find(e => e.event_id === h.event_id);
      return past?.skills.some(g => event.skills.some(s => s.skill_id === g.skill_id));
    });
    const skips = relevant.filter(h => ['no_show', 'declined', 'dropped'].includes(h.status)).length;
    const successes = relevant.filter(h => h.status === 'completed').length;
    const format = event.format || event.type;
    const sameFormat = history.filter(h => { const past = state.events.find(e => e.event_id === h.event_id); return (past?.format || past?.type) === format && !['in_progress', 'registered'].includes(h.status); });
    const formatRate = sameFormat.length ? sameFormat.filter(h => h.status === 'completed').length / sameFormat.length : 0.5;
    const repeat = !event.recurring && history.some(h => h.event_id === event.event_id && h.status === 'completed');
    const closed = gaps.reduce((n, g) => n + g.closed, 0);
    const criticality = gaps.reduce((n, g) => n + g.closed * Math.max(0, g.target - g.before) * (g.critical ? 2 : 1), 0);
    const score = closed * 12 + criticality * 4 + formatRate * 3 + Math.min(successes, 3) - skips * 5 - event.duration_hours * 0.4 - (repeat ? 100 : 0);
    const evidence = gaps.filter(g => g.closed > 0).map(g => `${g.name}: ${g.before}/${g.target} for ${path.next_grade} ${path.target_role}${g.critical ? ' (critical requirement)' : ''}; this activity takes you to ${g.after}/${g.target}.`);
    evidence.push(relevant.length ? `${successes} completed and ${skips} skipped or declined activities developing the same skills.` : 'A new skill-development direction; no participation history for these skills yet.');
    evidence.push(sameFormat.length ? `${Math.round(formatRate * 100)}% completion across ${sameFormat.length} previous ${format} activities.` : `Try a ${format} format in ${event.duration_hours} hours.`);
    if (event.prerequisites && Object.keys(event.prerequisites).length) evidence.push('Your current skills meet every prerequisite for this activity.');
    if (event.format === 'offline' && employee.work_format === 'remote') evidence.push('This activity is in person; you usually work remotely. Check whether attendance is practical.');
    if (lastTwo.length === 2 && lastTwo.every(h => h.on_time)) evidence.push('Your last two completed activities were finished on time.');
    return { ...event, changes: gaps, score: Math.round(score * 10) / 10, evidence, caution: skips >= 2 ? 'You have skipped similar activities before. Choose this only if the format works for you.' : null, repeat, closed };
  }).filter(e => e.closed > 0 && !e.repeat).sort((a, b) => b.score - a.score || a.event_id.localeCompare(b.event_id));
}
export function completeActivity(state, employee, eventId, now = asOf(state)) {
  const event = state.events.find(e => e.event_id === eventId);
  if (!event || !eligible(event, employee, state)) throw new Error('This activity is not available for this profile.');
  if (!event.recurring && state.history.some(h => h.employee_id === employee.employee_id && h.event_id === eventId && h.status === 'completed')) throw new Error('This activity has already been completed.');
  if (!state.enrollments.some(e => e.employee_id === employee.employee_id && e.event_id === eventId)) throw new Error('Join the activity before completing it.');
  const enrollment = state.enrollments.find(e => e.employee_id === employee.employee_id && e.event_id === eventId);
  if (event.recurring && enrollment.session_date && state.history.some(h => h.employee_id === employee.employee_id && h.event_id === eventId && h.status === 'completed' && h.session_date === enrollment.session_date)) throw new Error('This session has already been completed.');
  const changes = skillChanges(event, employee);
  for (const change of changes) employee.skills[change.skill_id] = change.after;
  state.history.push({ history_id: `H-${crypto.randomUUID()}`, employee_id: employee.employee_id, event_id: eventId, status: 'completed', date: now, session_date: enrollment.session_date, on_time: null, completion_pct: 100, changes, source: 'self_reported_demo' });
  state.enrollments = state.enrollments.filter(e => !(e.employee_id === employee.employee_id && e.event_id === eventId));
  return changes;
}
export function hrSummary(state, now = Date.parse(asOf(state))) {
  const people = state.employees.map(employee => {
    const hist = state.history.filter(h => h.employee_id === employee.employee_id);
    const recent = hist.filter(h => now >= new Date(h.date).getTime() && now - new Date(h.date).getTime() <= 90 * 86400000);
    const done = hist.filter(h => h.status === 'completed' && new Date(h.date).getTime() <= now).sort((a, b) => new Date(b.date) - new Date(a.date));
    const needsSupport = recent.filter(h => ['no_show', 'declined'].includes(h.status)).length >= 2 || !done.length || now - new Date(done[0].date).getTime() > 90 * 86400000;
    return { employee_id: employee.employee_id, name: employee.name, department: employee.department, role: employee.role, grade: employee.grade, readiness: trajectory(state, employee).readiness, needs_support: needsSupport, support_reason: recent.filter(h => ['no_show', 'declined'].includes(h.status)).length >= 2 ? 'Repeated missed or declined activities in 90 days' : 'No completed activity in 90 days', last_completed: done[0]?.date || null };
  });
  const gaps = state.skills.map(skill => {
      const applicable = state.employees.filter(e => targetLevel(skill, e) > 0);
    const behind = applicable.filter(e => (e.skills[skill.skill_id] || 0) < targetLevel(skill, e));
    return { skill_id: skill.skill_id, name: skill.name, category: skill.category, count: behind.length, total: applicable.length, percent: applicable.length ? Math.round(100 * behind.length / applicable.length) : 0 };
  }).filter(s => s.total).sort((a, b) => b.count - a.count);
  const recent = state.history.filter(h => now >= new Date(h.date).getTime() && now - new Date(h.date).getTime() <= 90 * 86400000);
  return { people, gaps, total: people.length, needs_support: people.filter(p => p.needs_support).length, completion_rate: recent.length ? Math.round(recent.filter(h => h.status === 'completed').length / recent.length * 100) : 0, active: new Set(recent.filter(h => h.status === 'completed').map(h => h.employee_id)).size };
}

export function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if (c === '\n' && !quoted) { row.push(field.replace(/\r$/, '')); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift();
  if (!headers?.length) throw new Error('CSV is empty.');
  if (new Set(headers).size !== headers.length) throw new Error('CSV has duplicate column names.');
  return rows.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`CSV row ${i + 2} has ${values.length} fields; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((key, j) => [key.trim(), values[j]]));
  });
}
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const id = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(x) && !['__proto__', 'constructor', 'prototype'].includes(x);
const label = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 500;
const level = x => Number.isInteger(x) && x >= 0 && x <= 5;
export function validateState(state) {
  if (state.meta?.as_of_date) assert(/^\d{4}-\d{2}-\d{2}$/.test(state.meta.as_of_date) && Number.isFinite(Date.parse(state.meta.as_of_date)), 'Invalid snapshot date.');
  for (const [key, pk] of [['employees', 'employee_id'], ['events', 'event_id'], ['skills', 'skill_id']]) {
    assert(Array.isArray(state[key]) && state[key].length > 0 && state[key].length <= 10000, `${key} must be a nonempty array (up to 10,000 rows).`);
    assert(state[key].every(x => x && id(x[pk])), `${key}: invalid or missing ${pk}.`);
    assert(new Set(state[key].map(x => x[pk])).size === state[key].length, `${key}: duplicate IDs.`);
  }
  const skillIds = new Set(state.skills.map(s => s.skill_id));
  if (state.role_profiles !== undefined) {
    assert(Array.isArray(state.role_profiles), 'role_profiles must be an array.');
    const keys = new Set();
    for (const p of state.role_profiles) {
      assert(p && label(p.role) && !['__proto__', 'constructor', 'prototype'].includes(p.role) && GRADES.includes(p.grade) && p.required_skills && typeof p.required_skills === 'object' && !Array.isArray(p.required_skills), 'Invalid role profile.');
      const key = `${p.role}:${p.grade}`; assert(!keys.has(key), 'Duplicate role/grade profile.'); keys.add(key);
      for (const [id, n] of Object.entries(p.required_skills)) assert(skillIds.has(id) && level(n), 'Role profile has an unknown skill or invalid level.');
      assert(Array.isArray(p.critical_skills) && p.critical_skills.every(id => Object.hasOwn(p.required_skills, id)), 'Critical skills must have a requirement.');
    }
  }
  for (const s of state.skills) {
    assert(label(s.name) && s.requirements && typeof s.requirements === 'object' && !Array.isArray(s.requirements), `${s.skill_id}: name and grade requirements are required.`);
    for (const [key, value] of Object.entries(s.requirements)) {
      if (GRADES.includes(key)) assert(level(value), `${s.skill_id}: grade requirement must be 0–5.`);
      else { assert(value && typeof value === 'object' && !Array.isArray(value), `${s.skill_id}: invalid role requirements.`); for (const [grade, n] of Object.entries(value)) assert(GRADES.includes(grade) && level(n), `${s.skill_id}: invalid grade requirement.`); }
    }
  }
  for (const e of state.employees) {
    assert(label(e.role) && GRADES.includes(e.grade) && Number.isInteger(e.tenure_months) && e.tenure_months >= 0, `${e.employee_id}: valid role, grade and tenure_months required.`);
    assert((e.name === undefined || label(e.name)) && (e.department === undefined || label(e.department)), `${e.employee_id}: name and department must be nonempty text when supplied.`);
    assert(e.skills && typeof e.skills === 'object' && !Array.isArray(e.skills), `${e.employee_id}: skills must be an object.`);
    for (const [key, value] of Object.entries(e.skills)) assert(skillIds.has(key) && level(value), `${e.employee_id}: unknown skill or level outside 0–5: ${key}.`);
    if (e.last_review_date !== undefined) assert(typeof e.last_review_date === 'string' && Number.isFinite(Date.parse(e.last_review_date)), `${e.employee_id}: invalid last_review_date.`);
    if (e.assessed_skills !== undefined) {
      assert(e.assessed_skills && typeof e.assessed_skills === 'object' && !Array.isArray(e.assessed_skills), 'assessed_skills must be an object.');
      for (const [key, value] of Object.entries(e.assessed_skills)) assert(skillIds.has(key) && level(value), `${e.employee_id}: invalid assessed skill.`);
    }
    if (e.career_goal != null) assert(e.career_goal && label(e.career_goal.target_role) && GRADES.includes(e.career_goal.target_grade), `${e.employee_id}: invalid career goal.`);
    if (state.role_profiles?.length) {
      assert(state.role_profiles.some(p => p.role === e.role && p.grade === e.grade), `${e.employee_id}: unknown role/grade.`);
      if (e.career_goal) assert(state.role_profiles.some(p => p.role === e.career_goal.target_role && p.grade === e.career_goal.target_grade), `${e.employee_id}: unknown career target.`);
    }
  }
  for (const e of state.events) {
    assert(label(e.title) && label(e.type) && Array.isArray(e.audience) && e.audience.every(label) && Number.isFinite(e.duration_hours) && e.duration_hours > 0, `${e.event_id}: title, type, audience array and positive duration_hours required.`);
    assert(!e.grades || (Array.isArray(e.grades) && e.grades.every(g => GRADES.includes(g))), `${e.event_id}: invalid grades.`);
    assert(e.voluntary === undefined || typeof e.voluntary === 'boolean', `${e.event_id}: voluntary must be boolean.`);
    assert(e.description === undefined || (typeof e.description === 'string' && e.description.length <= 5000), `${e.event_id}: description must be text of up to 5,000 characters.`);
    assert(Array.isArray(e.skills) && (e.skills.length || e.voluntary === false) && new Set(e.skills.map(g => g.skill_id)).size === e.skills.length, `${e.event_id}: unique skill gains required (empty allowed for mandatory events).`);
    for (const g of e.skills) assert(skillIds.has(g.skill_id) && level(g.gain) && g.gain > 0 && level(g.max_level), `${e.event_id}: invalid skill, gain or max_level.`);
    if (e.prerequisites !== undefined) {
      assert(e.prerequisites && typeof e.prerequisites === 'object' && !Array.isArray(e.prerequisites), `${e.event_id}: prerequisites must be an object.`);
      for (const [id, n] of Object.entries(e.prerequisites)) assert(skillIds.has(id) && level(n), `${e.event_id}: invalid prerequisite.`);
    }
    if (e.format !== undefined) assert(['online', 'offline', 'self_paced'].includes(e.format), `${e.event_id}: invalid format.`);
    if (e.upcoming_sessions !== undefined) assert(Array.isArray(e.upcoming_sessions) && e.upcoming_sessions.every(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d))), `${e.event_id}: invalid session date.`);
  }
  assert(Array.isArray(state.history) && state.history.length <= 100000, 'history must be an array of up to 100,000 rows.');
  const employees = new Set(state.employees.map(e => e.employee_id)); const events = new Set(state.events.map(e => e.event_id));
  const historyIds = new Set();
  for (const h of state.history) {
    assert(h && employees.has(h.employee_id) && events.has(h.event_id) && ['completed', 'no_show', 'declined', 'registered', 'in_progress', 'dropped', 'overdue'].includes(h.status) && typeof h.date === 'string' && Number.isFinite(Date.parse(h.date)) && (h.on_time === null || typeof h.on_time === 'boolean'), 'History contains an unknown employee/event, invalid date, status, or on_time value.');
    if (h.history_id) { assert(!historyIds.has(h.history_id), 'Duplicate history record ID.'); historyIds.add(h.history_id); }
    for (const k of ['completion_pct', 'score', 'feedback_rating']) if (h[k] != null) assert(Number.isInteger(h[k]) && h[k] >= (k === 'feedback_rating' ? 1 : 0) && h[k] <= (k === 'feedback_rating' ? 5 : 100), `Invalid history ${k}.`);
  }
  return state;
}
export function mergeImport(state, payload) {
  payload = normalizeDataset(payload);
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'Upload a dataset object or choose an individual file type.');
  assert(['employees', 'events', 'skills', 'history', 'activity_history'].some(k => payload[k] !== undefined), 'No recognized dataset collections were provided.');
  const candidate = structuredClone(state);
  for (const key of ['meta', 'role_profiles', 'proficiency_scale']) if (payload[key] !== undefined) candidate[key] = structuredClone(payload[key]);
  for (const [key, pk] of [['skills', 'skill_id'], ['events', 'event_id'], ['employees', 'employee_id']]) {
    if (payload[key] !== undefined) {
      assert(Array.isArray(payload[key]), `${key} must be an array.`);
      assert(new Set(payload[key].map(x => x?.[pk])).size === payload[key].length, `${key}: duplicate IDs in upload.`);
      const map = new Map(candidate[key].map(x => [x[pk], x]));
      for (const item of payload[key]) { assert(item && id(item[pk]), `${key}: invalid ID.`); map.set(item[pk], item); }
      candidate[key] = [...map.values()];
    }
  }
  const history = payload.history ?? payload.activity_history;
  if (history !== undefined) {
    assert(Array.isArray(history), 'history must be an array.');
    assert(history.every(h => h && [true, false, null].includes(h.on_time)), 'History on_time must be true, false or unknown.');
    // Replace history only for represented employees. Re-uploading is idempotent.
    const affected = new Set(history.map(h => h?.employee_id));
    candidate.history = candidate.history.filter(h => !affected.has(h.employee_id));
    candidate.history.push(...history);
  }
  validateState(candidate);
  compileRequirements(candidate);
  reconcileProgress(candidate);
  return validateState(candidate);
}
