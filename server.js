import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createSeed } from './lib/seed.js';
import { trajectory, recommend, eligible, skillChanges, completeActivity, hrSummary, mergeImport, parseCsv, validateState } from './lib/domain.js';
import { aiRecommendations } from './lib/ai.js';
import { aiConfig } from './lib/ai.js';
import { asOf, datasetFromFiles } from './lib/dataset.js';
import { loadDatasetDirectory } from './lib/dataset-loader.js';
import { normalizeLanguage } from './public/i18n.js';

const root = dirname(fileURLToPath(import.meta.url));
if (process.env.LOAD_ENV_FILE !== 'false' && existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
const stateFile = process.env.STATE_FILE || resolve(root, 'data/state.json');
const sourceDirectory = process.env.DATASET_DIR || resolve(root, 'data/source');
let state = existsSync(stateFile) ? validateState(JSON.parse(readFileSync(stateFile, 'utf8'))) : process.env.DATASET_MODE !== 'demo' && existsSync(resolve(sourceDirectory, 'employees.json')) ? loadDatasetDirectory(sourceDirectory) : createSeed();
state.enrollments ||= [];
const sessions = new Map(), attempts = new Map();
const recommendationCache = new Map();
let revision = 0;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && (!process.env.EMPLOYEE_PASSWORD || !process.env.HR_PASSWORD)) throw new Error('Set EMPLOYEE_PASSWORD and HR_PASSWORD before binding to a network interface.');
const accounts = {
  employee: { password: process.env.EMPLOYEE_PASSWORD || 'grow-together', role: 'employee', employee_id: process.env.EMPLOYEE_ID || 'E0028', name: 'Employee' },
  hr: { password: process.env.HR_PASSWORD || 'support-growth', role: 'hr', name: 'HR workspace' },
};
function save(next) {
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(`${stateFile}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
  renameSync(`${stateFile}.tmp`, stateFile);
  state = next; revision++; recommendationCache.clear();
}
if (!existsSync(stateFile)) save(state);
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
function fail(status, message) { const err = new Error(message); err.status = status; throw err; }
async function body(req) {
  let chunks = [], length = 0;
  for await (const chunk of req) { length += chunk.length; if (length > 8 * 1024 * 1024) fail(413, 'Upload limit is 8 MB.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'Request must contain valid JSON.'); }
}
function authenticate(req) {
  const token = req.headers.cookie?.split(';').map(c => c.trim()).find(c => c.startsWith('cq_session='))?.slice(11);
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) { sessions.delete(token); fail(401, 'Please sign in to continue.'); }
  return { ...session, token };
}
function secureEqual(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); }
function profile(session, query) {
  const wanted = query.get('employee_id') || session.employee_id;
  if (session.role !== 'hr' && wanted !== session.employee_id) fail(403, 'You can only access your own development profile.');
  const employee = state.employees.find(e => e.employee_id === wanted);
  if (!employee) fail(404, 'Employee profile not found.');
  return employee;
}
const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/i18n.js': ['i18n.js', 'text/javascript'], '/language.js': ['language.js', 'text/javascript'], '/catalog.js': ['catalog.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
export const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  try {
    const url = new URL(req.url, 'http://localhost'); const route = url.pathname;
    if (req.method === 'GET' && assets[route]) { const [file, type] = assets[route]; res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); return res.end(readFileSync(resolve(root, 'public', file))); }
    if (!route.startsWith('/api/')) fail(404, 'Not found.');
    if (!['GET', 'POST'].includes(req.method)) fail(405, 'Method not allowed.');
    if (req.method === 'POST') {
      if (!req.headers['content-type']?.startsWith('application/json')) fail(415, 'Use application/json.');
      if (req.headers.origin) {
        let origin; try { origin = new URL(req.headers.origin); } catch { fail(403, 'Invalid origin.'); }
        if (origin.host !== req.headers.host) fail(403, 'Cross-origin requests are not allowed.');
      }
    }
    if (route === '/api/config' && req.method === 'GET') return json(res, 200, { employee_name: state.employees.find(e => e.employee_id === accounts.employee.employee_id)?.name || accounts.employee.employee_id, employee_count: state.employees.length, snapshot_date: state.meta?.as_of_date || null, ai: aiConfig() });
    if (route === '/api/login' && req.method === 'POST') {
      const b = await body(req), key = req.socket.remoteAddress;
      const attempt = attempts.get(key) || { count: 0, until: Date.now() + 60000 };
      if (attempt.until < Date.now()) { attempt.count = 0; attempt.until = Date.now() + 60000; }
      if (++attempt.count > 20) fail(429, 'Too many attempts. Try again in a minute.');
      attempts.set(key, attempt);
      const account = Object.hasOwn(accounts, b.username) ? accounts[b.username] : null;
      if (!account || !secureEqual(b.password, account.password)) fail(401, 'Incorrect username or password.');
      attempts.delete(key);
      for (const [token, s] of sessions) if (s.expires < Date.now()) sessions.delete(token);
      const token = randomBytes(32).toString('hex');
      const { password, ...user } = account;
      if (user.role === 'employee') user.name = state.employees.find(e => e.employee_id === user.employee_id)?.name || user.employee_id;
      sessions.set(token, { ...user, expires: Date.now() + 8 * 3600000 });
      res.setHeader('Set-Cookie', `cq_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`);
      return json(res, 200, user);
    }
    const session = authenticate(req);
    if (route === '/api/me' && req.method === 'GET') { const { token, expires, ...user } = session; if (user.role === 'employee') user.name = state.employees.find(e => e.employee_id === user.employee_id)?.name || user.employee_id; return json(res, 200, user); }
    if (route === '/api/logout' && req.method === 'POST') { sessions.delete(session.token); res.setHeader('Set-Cookie', 'cq_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return json(res, 200, { ok: true }); }
    if (route === '/api/profile' && req.method === 'GET') {
      const employee = profile(session, url.searchParams);
      return json(res, 200, { employee, snapshot_date: state.meta?.as_of_date || null, trajectory: trajectory(state, employee), history: state.history.filter(h => h.employee_id === employee.employee_id).map(h => ({ ...h, title: state.events.find(e => e.event_id === h.event_id)?.title })).sort((a, b) => new Date(b.date) - new Date(a.date)), enrollments: state.enrollments.filter(e => e.employee_id === employee.employee_id) });
    }
    if (route === '/api/recommendations' && req.method === 'GET') {
      const employee = profile(session, url.searchParams); const before = revision;
      const language = normalizeLanguage(url.searchParams.get('lang'));
      const key = `${before}:${employee.employee_id}:${language}`;
      let cached = recommendationCache.get(key);
      if (!cached || cached.expires < Date.now()) {
        cached = { expires: Date.now() + 5 * 60000, promise: aiRecommendations(employee, recommend(state, employee), fetch, language) };
        recommendationCache.set(key, cached);
      }
      const result = await cached.promise;
      if (result.mode === 'rules' && result.provider !== 'rules') recommendationCache.delete(key);
      if (before !== revision) fail(409, 'Profile data changed during recommendation. Please refresh.');
      return json(res, 200, { ...result, language });
    }
    if (route === '/api/events' && req.method === 'GET') {
      const employee = profile(session, url.searchParams);
      return json(res, 200, state.events.filter(e => eligible(e, employee, state)).map(e => ({ ...e, changes: skillChanges(e, employee).map(c => ({ ...c, name: state.skills.find(s => s.skill_id === c.skill_id).name })), completed: !e.recurring && state.history.some(h => h.employee_id === employee.employee_id && h.event_id === e.event_id && h.status === 'completed'), joined: state.enrollments.some(h => h.employee_id === employee.employee_id && h.event_id === e.event_id) })));
    }
    if (['/api/enroll', '/api/complete', '/api/withdraw'].includes(route) && req.method === 'POST') {
      if (session.role !== 'employee') fail(403, 'Activity actions are available only in your own employee account.');
      const b = await body(req); const next = structuredClone(state); const employee = next.employees.find(e => e.employee_id === session.employee_id);
      const event = next.events.find(e => e.event_id === b.event_id);
      if (!event || !eligible(event, employee, next)) fail(400, 'Activity unavailable: check role, grade, prerequisites and session availability.');
      let changes;
      if (route === '/api/complete') changes = completeActivity(next, employee, b.event_id);
      else if (route === '/api/withdraw') {
        next.enrollments = next.enrollments.filter(e => !(e.employee_id === employee.employee_id && e.event_id === b.event_id));
        next.withdrawn_enrollments = [...new Set([...(next.withdrawn_enrollments || []), `${employee.employee_id}:${b.event_id}`])];
      }
      else {
        if (!event.recurring && next.history.some(h => h.employee_id === employee.employee_id && h.event_id === b.event_id && h.status === 'completed')) fail(409, 'Activity already completed.');
        const sessionDate = event.upcoming_sessions?.find(d => d >= asOf(next).slice(0, 10) && !next.history.some(h => h.employee_id === employee.employee_id && h.event_id === event.event_id && h.status === 'completed' && h.session_date === d));
        if (event.recurring && event.format !== 'self_paced' && !sessionDate) fail(409, 'No remaining sessions available.');
        next.withdrawn_enrollments = (next.withdrawn_enrollments || []).filter(key => key !== `${employee.employee_id}:${b.event_id}`);
        if (!next.enrollments.some(e => e.employee_id === employee.employee_id && e.event_id === b.event_id)) next.enrollments.push({ employee_id: employee.employee_id, event_id: b.event_id, date: asOf(next), session_date: sessionDate });
      }
      save(next); return json(res, 200, { ok: true, changes, trajectory: trajectory(state, employee) });
    }
    if (route.startsWith('/api/hr/')) {
      if (session.role !== 'hr') fail(403, 'HR access is required.');
      if (route === '/api/hr/summary' && req.method === 'GET') return json(res, 200, hrSummary(state));
      if (route === '/api/hr/export' && req.method === 'GET') return json(res, 200, { meta: state.meta, role_profiles: state.role_profiles, proficiency_scale: state.proficiency_scale, employees: state.employees, events: state.events, skills: state.skills, history: state.history });
      if (route === '/api/hr/import' && req.method === 'POST') {
        const b = await body(req);
        let payload = b.dataset;
        if (b.files) {
          if (!Array.isArray(b.files)) fail(400, 'Files must be an array.');
          payload = datasetFromFiles(b.files.map(f => ({ name: f.name, parsed: String(f.name).toLowerCase().endsWith('.csv') ? parseCsv(f.text) : JSON.parse(f.text.replace(/^\uFEFF/, '')) })));
        }
        const candidate = mergeImport(state, payload);
        const counts = Object.fromEntries(['employees', 'events', 'skills', 'history'].map(k => [k, candidate[k].length]));
        if (b.preview) return json(res, 200, { counts, message: 'Validated. Ready to import.', revision });
        if (b.revision !== revision) fail(409, 'Data changed since validation. Validate your files again.');
        save(candidate); return json(res, 200, { counts, message: 'Dataset imported successfully.' });
      }
    }
    fail(404, 'API endpoint not found.');
  } catch (error) { json(res, error.status || (error instanceof SyntaxError ? 400 : 400), { error: error.message || 'Request failed.' }); }
});
server.listen(port, host, () => console.log(`Career Quest is running at http://${host}:${server.address().port}\nDataset: ${state.employees.length} profiles, ${state.events.length} events, ${state.history.length} history records${state.meta?.as_of_date ? ` (snapshot ${state.meta.as_of_date})` : ''}\nRecommendation provider: ${aiConfig().provider} (${aiConfig().configured ? 'configured' : 'configuration needed'})`));
