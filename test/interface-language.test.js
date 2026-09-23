import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { createSeed } from '../lib/seed.js';
import { trajectory, recommend, hrSummary } from '../lib/domain.js';
import { translateText } from '../public/i18n.js';
import { languagePicker } from '../public/language.js';
import { loadDatasetDirectory } from '../lib/dataset-loader.js';

// Exercise the real page renderers, including text split by inline markup.
// This checks generated content; it does not simulate browser layout.
for (const dataset of ['demo', 'source']) test(`Kazakh covers employee and HR pages with ${dataset} data`, { skip: dataset === 'source' && !existsSync('data/source/employees.json') }, () => {
  const rendered = [];
  const elements = new Map();
  const element = () => ({
    set innerHTML(value) { rendered.push(value); },
    set textContent(value) { this._text = value; rendered.push(`<span>${value}</span>`); },
    get textContent() { return this._text; },
    querySelector: () => element(), querySelectorAll: () => [],
    addEventListener() {}, showModal() {}, remove() {}, classList: { add() {}, remove() {} },
  });
  const document = { body: { append() {} }, addEventListener() {}, createElement: element,
    querySelector(selector) { if (!elements.has(selector)) elements.set(selector, element()); return elements.get(selector); },
    querySelectorAll: () => [],
  };
  const state = dataset === 'demo' ? createSeed() : loadDatasetDirectory('data/source'), employee = state.employees[27];
  const context = vm.createContext({ document, translateText, languagePicker,
    readLanguage: () => 'kk', createTranslator: () => ({ apply() {} }),
    MutationObserver: class { observe() {} }, state, employee, trajectory, recommend, hrSummary,
  });
  const source = readFileSync('public/app.js', 'utf8').replace(/^import .*;\r?\n/gm, '').split('(async () => { try { config =')[0];
  vm.runInContext(source, context);
  vm.runInContext(`
    login();
    user = { role: 'employee', name: employee.name };
    data = { employee, trajectory: trajectory(state, employee), snapshot_date: state.meta?.as_of_date,
      history: state.history.filter(h => h.employee_id === employee.employee_id).map(h => ({ ...h, title: state.events.find(e => e.event_id === h.event_id)?.title })), enrollments: [] };
    events = recommend(state, employee);
    recommendations = { mode: 'rules', note: '', recommendations: events };
    for (const page of ['overview', 'path', 'activities', 'journal', 'preview']) {
      view = page; shell(); renderEmployee();
    }
    renderRecommendations(); openActivity(events[0].event_id);
    user = { role: 'hr', name: 'HR workspace' }; hr = hrSummary(state);
    for (const page of ['hr', 'import']) { view = page; shell(); if(page === 'hr') renderHR(); else renderImport(); }
    search = translateText(hr.people[0].department, 'kk'); renderPeople();
    data.trajectory = { ...data.trajectory, next_grade: null, readiness: null };
    renderPath();
  `, context);
  const unchanged = new Set();
  const allowed = new Set(['career','quest','Career Quest','EN','RU','KZ','HR',employee.name.split(/\s+/).map(s => s[0]).slice(0,2).join(''),'Python','Java','SQL','CI/CD','JavaScript','TypeScript','React','HTML & CSS','employees.json','events.json','skills.json','activity_history.csv']);
  for (const html of rendered) {
    const visible = html.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/g, '<svg></svg>').replace(/<(code|[^> ]+\s+data-no-i18n)[^>]*>[\s\S]*?<\/[^>]+>/g, '<span></span>');
    for (const [, raw] of visible.matchAll(/>([^<>]+)</g)) {
      const text = raw.trim().replaceAll('&amp;', '&').replaceAll('&#39;', "'");
      if (!/[A-Za-z]{2}/.test(text) || allowed.has(text) || /^E\d+/.test(text)) continue;
      if (translateText(text, 'kk') === text) unchanged.add(text);
    }
  }
  assert.deepEqual([...unchanged], [], 'Untranslated visible text');
  assert.match(elements.get('#people-count').textContent, /^[1-9]\d* colleagues$/, 'Localized HR search should find colleagues');
});
