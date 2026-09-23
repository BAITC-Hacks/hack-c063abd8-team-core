import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { icon, esc, brand, heading, catalogSummary } from '../public/components.js';
import { translateText } from '../public/i18n.js';
import { languagePicker } from '../public/language.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function harness() {
  const nodes = new Map(), requests = [];
  const node = () => ({ innerHTML: '', textContent: '', disabled: false, querySelectorAll: () => [], classList: { add() {}, remove() {} } });
  const document = { body: {}, addEventListener() {}, querySelectorAll: () => [], querySelector(key) { if (!nodes.has(key)) nodes.set(key, node()); return nodes.get(key); } };
  const context = vm.createContext({ document, icon, esc, brand, heading, catalogSummary, languagePicker, translateText, structuredClone,
    window: { addEventListener() {} }, MutationObserver: class { observe() {} },
    readLanguage: () => 'en', createTranslator: () => ({ apply() {} }), setTimeout() {}, clearTimeout() {},
    fetch(path, options) { const response = deferred(); requests.push({ path, body: JSON.parse(options.body), response }); return response.promise; },
  });
  const source = readFileSync('public/app.js', 'utf8').replace(/^import .*;\r?\n/gm, '').split('(async () => { try { config =')[0];
  vm.runInContext(source, context);
  vm.runInContext('renderImport()', context);
  const get = key => document.querySelector('#' + key);
  const select = (data, read = async () => JSON.stringify(data)) => get('dataset-files').onchange({ target: { files: [{ name: 'input.json', size: 123, text: read }] } });
  const reply = (request, data) => request.response.resolve({ ok: true, json: async () => data });
  const preview = restoring => ({ counts: { employees: 1, events: 1, skills: 1, history: 0 }, revision: 2, restoring });
  return { get, select, reply, preview, requests, context };
}

test('a stale preview cannot authorize a replacement backup; apply sends the previewed snapshot', async () => {
  const h = harness(), a = { employees: [{ employee_id: 'A' }] }, b = { kind: 'career-quest-backup', backup_version: 1, state: {} };
  await h.select(a);
  const checkingA = h.get('validate-import').onclick();
  await h.select(b);
  h.reply(h.requests[0], h.preview(false)); await checkingA;
  assert.equal(h.get('apply-import').disabled, true);
  await h.get('apply-import').onclick(); assert.equal(h.requests.length, 1);
  assert.equal(h.get('import-feedback').textContent, '');
  const checkingB = h.get('validate-import').onclick();
  h.reply(h.requests[1], h.preview(true)); await checkingB;
  assert.match(h.get('import-feedback').textContent, /replaces all current data/);
  assert.equal(h.get('apply-import').textContent, 'Restore full backup');
  const applying = h.get('apply-import').onclick();
  assert.deepEqual(h.requests[2].body, { dataset: b, revision: 2 });
  assert.equal(h.get('dataset-files').disabled, true);
  h.reply(h.requests[2], { message: 'Dataset imported successfully.' }); await applying;
  assert.equal(h.get('dataset-files').disabled, false);
});

test('late file reads and failed previews do not overwrite the current selection', async () => {
  const h = harness(), slowRead = deferred(), a = { employees: [] }, b = { events: [] };
  const readingA = h.select(a, () => slowRead.promise);
  await h.select(b);
  slowRead.resolve(JSON.stringify(a)); await readingA;
  const checkingB = h.get('validate-import').onclick();
  assert.deepEqual(h.requests[0].body.dataset, b);
  await h.select(a);
  const checkingA = h.get('validate-import').onclick();
  h.reply(h.requests[1], h.preview(false)); await checkingA;
  const message = h.get('import-feedback').textContent;
  h.requests[0].response.reject(new Error('Stale failure')); await checkingB;
  assert.equal(h.get('import-feedback').textContent, message);
  assert.equal(h.get('apply-import').disabled, false);
});

test('imported activity types are escaped in both filter attributes and labels', () => {
  const h = harness();
  h.context.maliciousType = '\"><img src=x onerror="alert(1)">';
  vm.runInContext(`user = { role: 'employee' }; data = { enrollments: [], history: [] };
    events = [{ event_id: 'E', title: 'Test', type: maliciousType, duration_hours: 1, changes: [] }]; renderActivities();`, h.context);
  const html = h.get('content').innerHTML;
  assert.ok(html.includes(`data-filter="${esc(h.context.maliciousType)}"`));
  assert.ok(html.includes(`>${esc(h.context.maliciousType)}</button>`));
  assert.ok(!html.includes('<img'));
});
