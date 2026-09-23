import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';

test('API enforces permissions, validates imports and persists completion', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'career-quest-test-'));
  const statePath = join(directory, 'state.json');
  const child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', HOST: '127.0.0.1', STATE_FILE: statePath, DATASET_MODE: 'demo', LOAD_ENV_FILE: 'false', AI_PROVIDER: 'rules', OLLAMA_MODEL: '', EMPLOYEE_PASSWORD: 'grow-together', HR_PASSWORD: 'support-growth' }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
      let output = '';
      child.stdout.on('data', chunk => { output += chunk; const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } });
      child.on('error', e => { clearTimeout(timer); reject(e); });
      child.on('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
    });
    async function request(path, cookie = '', payload, extra = {}) {
      const r = await fetch(base + path, { method: payload === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', ...extra }, body: payload === undefined ? undefined : JSON.stringify(payload) });
      return { status: r.status, headers: r.headers, data: await r.json() };
    }
    assert.equal((await request('/api/profile')).status, 401);
    assert.equal((await request('/api/login', '', { username: 'hr', password: 'wrong' })).status, 401);
    const employeeLogin = await request('/api/login', '', { username: 'employee', password: 'grow-together' });
    const employee = employeeLogin.headers.get('set-cookie').split(';')[0];
    assert.match(employeeLogin.headers.get('set-cookie'), /HttpOnly/);
    assert.equal((await request('/api/hr/summary', employee)).status, 403);
    assert.equal((await request('/api/profile?employee_id=E0001', employee)).status, 403);
    assert.equal((await request('/api/enroll', employee, { event_id: 'EV001' }, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await request('/api/recommendations', employee)).data.recommendations[0].event_id, 'EV001');
    assert.equal((await request('/api/recommendations?lang=ru', employee)).data.language, 'ru');
    assert.equal((await request('/api/recommendations?lang=kz', employee)).data.language, 'kk');
    assert.equal((await request('/api/recommendations?lang=invalid', employee)).data.language, 'en');
    for (const path of ['/i18n.js','/language.js','/catalog.js']) assert.equal((await fetch(base + path)).status,200);
    assert.equal((await request('/api/complete', employee, { event_id: 'EV001' })).status, 400);
    assert.equal((await request('/api/enroll', employee, { event_id: 'EV001' })).status, 200);
    const completed = await request('/api/complete', employee, { event_id: 'EV001' });
    assert.equal(completed.data.changes[0].after, 3);
    assert.equal((await request('/api/complete', employee, { event_id: 'EV001' })).status, 400);
    const disk = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(disk.employees[27].skills.SK_SYSTEM_DESIGN, 3);
    const hrLogin = await request('/api/login', '', { username: 'hr', password: 'support-growth' });
    const hr = hrLogin.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/hr/summary', hr)).data.total, 200);
    assert.equal((await request('/api/complete', hr, { event_id: 'EV001' })).status, 403);
    const dataset = { employees: [{ ...disk.employees[27], employee_id: 'JURY_NEW', name: 'Jury test' }] };
    const preview = await request('/api/hr/import', hr, { dataset, preview: true });
    assert.equal(preview.data.counts.employees, 201);
    assert.equal((await request('/api/hr/summary', hr)).data.total, 200);
    assert.equal((await request('/api/hr/import', hr, { dataset, revision: preview.data.revision })).status, 200);
    assert.equal((await request('/api/hr/import', hr, { dataset, revision: preview.data.revision })).status, 409);
    assert.equal((await request('/api/profile?employee_id=JURY_NEW', hr)).status, 200);
    const bad = { employees: [{ ...disk.employees[27], skills: { SK_PYTHON: 100 } }] };
    assert.equal((await request('/api/hr/import', hr, { dataset: bad, preview: true })).status, 400);
    assert.equal((await request('/api/profile?employee_id=E0028', hr)).data.employee.skills.SK_PYTHON, 3);
    const csv = 'employee_id,event_id,date,status,on_time\nJURY_NEW,EV003,2026-09-01,no_show,false\n';
    const files = [{ name: 'activity_history.csv', text: csv }];
    const csvPreview = await request('/api/hr/import', hr, { files, preview: true });
    assert.equal(csvPreview.status, 200);
    assert.equal((await request('/api/hr/import', hr, { files, revision: csvPreview.data.revision })).status, 200);
    assert.equal((await request('/api/profile?employee_id=JURY_NEW', hr)).data.history.length, 1);
    await request('/api/logout', employee, {});
    assert.equal((await request('/api/profile', employee)).status, 401);
  } finally {
    const stopped = new Promise(resolve => child.once('exit', resolve));
    if (child.exitCode === null) { child.kill(); await stopped; }
    // This is a newly created, unique test-owned directory, never a user-supplied path.
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('career-quest-test-'));
    await rm(directory, { recursive: true, force: true });
  }
});
