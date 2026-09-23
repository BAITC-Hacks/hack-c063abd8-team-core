const own = (x, k) => Object.hasOwn(x, k);
export const asOf = state => state.meta?.as_of_date ? `${state.meta.as_of_date}T12:00:00.000Z` : new Date().toISOString();
// Legacy history uses date as the session date. IDs identify rows, not earned credit.
export const completionKey = (event, row) => `${row.employee_id}:${row.event_id}:${event?.recurring ? (row.session_date || row.date.slice(0, 10)) : 'once'}`;
export function uniqueCompletions(state) {
  const events = new Map(state.events.map(e => [e.event_id, e]));
  const seen = new Set();
  return state.history.filter(h => h.status === 'completed').sort((a, b) => a.date.localeCompare(b.date)).filter(h => {
    const key = completionKey(events.get(h.event_id), h);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function normalizeDataset(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Dataset must be an object.');
  const out = { ...input };
  const metadata = [input.meta];
  for (const key of ['employees', 'events', 'skills', 'history']) {
    const value = input[key] ?? (key === 'history' ? input.activity_history : undefined);
    if (value === undefined) continue;
    if (Array.isArray(value)) out[key] = value;
    else if (value && Array.isArray(value[key])) {
      out[key] = value[key]; metadata.push(value.meta);
      if (key === 'skills') {
        if (value.role_profiles) out.role_profiles = value.role_profiles;
        if (value.proficiency_scale) out.proficiency_scale = value.proficiency_scale;
      }
    } else throw new Error(`${key} must be an array or a ${key} wrapper.`);
  }
  const dates = new Set(metadata.filter(Boolean).map(m => m.as_of_date).filter(Boolean));
  if (dates.size > 1) throw new Error('Dataset files have different snapshot dates.');
  out.meta = Object.assign({}, ...metadata.filter(Boolean));
  if (!Object.keys(out.meta).length) delete out.meta;
  if (out.employees) out.employees = out.employees.map(e => {
    if (!e || typeof e !== 'object') throw new Error('Invalid employee row.');
    const normalized = { ...e, name: e.name ?? e.full_name };
    if (e.last_review_date) normalized.assessed_skills = structuredClone(e.assessed_skills ?? e.skills);
    return normalized;
  });
  if (out.events) out.events = out.events.map(e => {
    if (!e || typeof e !== 'object') throw new Error('Invalid event row.');
    for (const key of ['mandatory', 'voluntary', 'recurring']) if (e[key] !== undefined && typeof e[key] !== 'boolean') throw new Error(`${e.event_id}: ${key} must be boolean.`);
    return { ...e, audience: e.target_roles ?? e.audience, grades: e.target_grades ?? e.grades,
      skills: e.develops_skills ?? e.skills, voluntary: e.mandatory === undefined ? e.voluntary : !e.mandatory,
      recurring: e.recurring ?? (e.event_id === 'EV_036' && own(e, 'develops_skills')) };
  });
  if (out.skills) out.skills = out.skills.map(s => ({ ...s, requirements: s.requirements ?? {} }));
  if (out.history) out.history = out.history.map(h => {
    if (!h || typeof h !== 'object') throw new Error('Invalid history row.');
    const row = { ...h, history_id: h.history_id || h.record_id || `I-${crypto.randomUUID()}` };
    // The starter kit records session/enrollment dates, not actual completion dates.
    // A missing on_time is unknown, never inferred from those dates.
    if (!own(h, 'on_time')) row.on_time = null;
    else if (h.on_time === 'true') row.on_time = true;
    else if (h.on_time === 'false') row.on_time = false;
    for (const k of ['completion_pct', 'score', 'feedback_rating']) {
      if (own(row, k)) row[k] = row[k] === '' || row[k] === null ? null : Number(row[k]);
    }
    return row;
  });
  return out;
}

export function compileRequirements(state) {
  if (!state.role_profiles) return;
  const byId = new Map(state.skills.map(s => [s.skill_id, s]));
  for (const s of state.skills) { s.requirements = {}; s.critical_for = {}; }
  for (const profile of state.role_profiles) {
    for (const [skillId, level] of Object.entries(profile.required_skills || {})) {
      const skill = byId.get(skillId);
      if (!skill) throw new Error(`Role profile refers to unknown skill ${skillId}.`);
      skill.requirements[profile.role] ||= {};
      skill.requirements[profile.role][profile.grade] = level;
      skill.critical_for[profile.role] ||= [];
      if (profile.critical_skills?.includes(skillId)) skill.critical_for[profile.role].push(profile.grade);
    }
  }
}

export function reconcileProgress(state) {
  const byId = new Map(state.events.map(e => [e.event_id, e]));
  const histories = new Map();
  for (const h of uniqueCompletions(state)) {
    if (!histories.has(h.employee_id)) histories.set(h.employee_id, []);
    histories.get(h.employee_id).push(h);
  }
  for (const employee of state.employees) {
    if (!employee.assessed_skills || !employee.last_review_date) continue;
    employee.skills = { ...employee.assessed_skills };
    employee.applied_history_ids = [];
    const history = (histories.get(employee.employee_id) || []).filter(h => h.status === 'completed' && h.date.slice(0, 10) > employee.last_review_date.slice(0, 10) && new Date(h.date) <= new Date(asOf(state))).sort((a, b) => a.date.localeCompare(b.date) || a.history_id.localeCompare(b.history_id));
    for (const h of history) {
      for (const gain of byId.get(h.event_id)?.skills || []) {
        const before = employee.skills[gain.skill_id] || 0;
        employee.skills[gain.skill_id] = Math.max(before, Math.min(5, gain.max_level, before + gain.gain));
      }
      employee.applied_history_ids.push(h.history_id);
    }
  }
  const completed = new Set(state.history.filter(h => h.status === 'completed' && !byId.get(h.event_id)?.recurring).map(h => `${h.employee_id}:${h.event_id}`));
  const enrollments = new Map((state.enrollments || []).filter(e => !completed.has(`${e.employee_id}:${e.event_id}`)).map(e => [`${e.employee_id}:${e.event_id}`, e]));
  const latest = new Map();
  for (const h of [...state.history].sort((a, b) => a.date.localeCompare(b.date))) latest.set(`${h.employee_id}:${h.event_id}`, h);
  for (const [key, h] of latest) if (h.status === 'in_progress' && byId.get(h.event_id)?.voluntary !== false && !completed.has(key) && !enrollments.has(key) && !(state.withdrawn_enrollments || []).includes(key)) enrollments.set(key, { employee_id: h.employee_id, event_id: h.event_id, date: h.date, imported: true });
  state.enrollments = [...enrollments.values()];
  return state;
}

export function datasetFromFiles(files) {
  if (!Array.isArray(files) || !files.length || files.length > 4) throw new Error('Choose one to four dataset files.');
  const payload = {};
  // CSV parsing is supplied by the caller, keeping this module independent.
  for (const f of files) {
    const key = ({ 'employees.json': 'employees', 'events.json': 'events', 'skills.json': 'skills', 'activity_history.csv': 'history', 'history.json': 'history' })[String(f.name).toLowerCase()];
    if (!key) throw new Error(`Unsupported filename: ${String(f.name)}.`);
    if (own(payload, key)) throw new Error(`Duplicate ${key} file.`);
    payload[key] = f.parsed;
  }
  return normalizeDataset(payload);
}
