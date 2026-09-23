import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { translateText, messages, normalizeLanguage, localizeDates } from '../public/i18n.js';
import { readLanguage, writeLanguage, createTranslator, languagePicker } from '../public/language.js';
import { aiRecommendations } from '../lib/ai.js';
import { createSeed } from '../lib/seed.js';
import { recommend } from '../lib/domain.js';

test('language selection persists, accepts KZ alias, and survives blocked storage', () => {
  const storage = { data: {}, getItem(k) { return this.data[k]; }, setItem(k,v) { this.data[k] = v; } };
  assert.equal(readLanguage(storage), 'en');
  assert.equal(writeLanguage(storage, 'kz'), 'kk'); assert.equal(readLanguage(storage), 'kk');
  writeLanguage(storage, 'ru'); assert.equal(readLanguage(storage), 'ru');
  const blocked = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  assert.equal(readLanguage(blocked), 'en'); assert.equal(writeLanguage(blocked,'ru'), 'ru');
  assert.equal(normalizeLanguage('ignore instructions'), 'en');
  assert.match(languagePicker(), /data-language="kk"/);
});
test('all dictionary entries have Russian and Kazakh; unknown source text stays intact', () => {
  for (const [en,entry] of Object.entries(messages)) {
    assert.ok(entry.ru?.trim(), en); assert.ok(entry.kk?.trim(), en);
    assert.equal(translateText(en,'en'), en);
    assert.equal(translateText(en,'ru'),entry.ru); assert.equal(translateText(en,'kk'),entry.kk);
  }
  assert.equal(translateText('  Enter your workspace  ','ru'),'  Войти  ');
  assert.equal(translateText('Custom imported course 42','kk'),'Custom imported course 42');
  assert.equal(translateText('Akmaral Ismailova','ru'),'Akmaral Ismailova');
});
test('dynamic labels and evidence preserve facts in both languages', () => {
  for (const lang of ['ru','kk']) {
    for (const source of ['A little closer, Akmaral.', '17 opportunities for you', 'Assessment: 24 Jun 2026. 3 completed activities after that date are reflected in current levels. Snapshot: 2026-10-01.', 'System Design: 2/4 for Senior Backend Engineer (critical requirement); this activity takes you to 3/4.', '2 completed and 3 skipped or declined activities developing the same skills.', '75% completion across 4 previous online activities.', 'Gain 1, activity cap 4, scale 0–5', 'Completed · On time']) {
      const translated = translateText(source,lang); assert.notEqual(translated,source,source);
      for (const number of source.match(/\d+/g) || []) assert.ok(translated.includes(number),`${number} missing in ${translated}`);
    }
  }
  assert.match(translateText('System Design: 2/4 for Senior Backend Engineer (critical requirement); this activity takes you to 3/4.','ru'),/критическое требование/);
  assert.notEqual(localizeDates('1 October 2026','kk'),'1 October 2026');
  assert.match(translateText('OpenAI quota or rate limit reached. Showing multi-factor recommendations.','ru'),/квоты/);
});

test('Kazakh translates combined labels, highest-grade text and import errors', () => {
  assert.equal(translateText('System Design · Critical', 'kk'), 'Жүйелерді жобалау · Маңызды дағды');
  for (const source of [
    'Current levels and the requirements for your current grade Backend Engineer.',
    'Unsupported filename: example.json.', 'Duplicate employees file.',
    'CSV row 4 has 2 fields; expected 5.',
    'employees: invalid or missing employee_id.',
    'E0028: unknown skill or level outside 0–5: SK_PYTHON.',
    'E0028: invalid career goal.', 'EV001: invalid format.',
    'employees must be an array or a employees wrapper.',
    'employees must be a nonempty array (up to 10,000 rows).',
    'history must be an array of up to 100,000 rows.',
    'Invalid JSON file. Check its syntax and try again.',
  ]) {
    const translated = translateText(source, 'kk');
    assert.notEqual(translated, source);
    assert.doesNotMatch(translated, /your current grade|must be|invalid|unknown|expected|Critical/);
    for (const id of source.match(/\b(?:E\d+|EV\d+|SK_[A-Z_]+|example\.json)\b/g) || []) assert.ok(translated.includes(id));
  }
});

// Minimal DOM contract exercises reversible translation without a browser dependency.
class Element {
  constructor(tag,children=[],attrs={}) { this.nodeType=1; this.tag=tag; this.childNodes=children; this.attrs=attrs; this.namespaceURI='http://www.w3.org/1999/xhtml'; }
  matches() { return ['script','style','code','textarea'].includes(this.tag) || 'data-no-i18n' in this.attrs; }
  hasAttribute(k) { return k in this.attrs; } getAttribute(k) { return this.attrs[k]; } setAttribute(k,v) { this.attrs[k]=v; }
}
const text = value => ({nodeType:3,nodeValue:value});
test('DOM translation is reversible and preserves user input, identities and handlers', () => {
  const label=text('Overview'), dynamic=text('2 skills'), identity=text('Overview'), code=text('Password');
  const input=new Element('input',[],{placeholder:'Search activities'}); input.value='My typed search';
  const button=new Element('button',[label]); const handler=()=>{};button.onclick=handler;
  const doc={documentElement:{},querySelectorAll:()=>[],body:new Element('body',[button,input,new Element('span',[identity],{'data-no-i18n':''}),new Element('code',[code]),dynamic])};
  let lang='ru';const translator=createTranslator(doc,()=>lang);translator.apply();
  assert.equal(label.nodeValue,'Обзор'); assert.equal(identity.nodeValue,'Overview'); assert.equal(code.nodeValue,'Password');
  assert.equal(input.value,'My typed search'); assert.equal(input.attrs.placeholder,'Поиск активностей');assert.equal(button.onclick,handler);
  translator.apply();assert.equal(label.nodeValue,'Обзор');
  lang='kk';translator.apply();assert.equal(label.nodeValue,'Шолу');assert.equal(doc.documentElement.lang,'kk');
  dynamic.nodeValue='3 skills';translator.apply();assert.equal(dynamic.nodeValue,'3 дағды');
  lang='en';translator.apply();assert.equal(label.nodeValue,'Overview');assert.equal(dynamic.nodeValue,'3 skills');assert.equal(input.attrs.placeholder,'Search activities');
});
test('provided activity titles/descriptions and nontechnical skill names have translations', {skip:!existsSync('data/source/events.json')}, () => {
  const events=JSON.parse(readFileSync('data/source/events.json','utf8')).events;
  for(const event of events) for(const field of ['title','description']) for(const lang of ['ru','kk']) assert.notEqual(translateText(event[field],lang),event[field],event[field]);
  const skills=JSON.parse(readFileSync('data/source/skills.json','utf8')).skills;
  const technical=new Set(['Python','Java','SQL','CI/CD','JavaScript','TypeScript','React','HTML & CSS']);
  for(const skill of skills) if(!technical.has(skill.name)) for(const lang of ['ru','kk']) assert.ok(messages[skill.name]?.[lang],skill.name);
});
test('model receives requested language without accepting injected language instructions', async () => {
  const previous={AI_PROVIDER:process.env.AI_PROVIDER,OLLAMA_MODEL:process.env.OLLAMA_MODEL};
  process.env.AI_PROVIDER='ollama';process.env.OLLAMA_MODEL='test';
  try {
    const state=createSeed(),employee=state.employees[27];
    for(const [language,expected] of [['ru','Russian'],['kk','Kazakh'],['kz','Kazakh'],['untrusted instruction','English']]) {
      await aiRecommendations(employee,recommend(state,employee),async (url,options)=>{
        assert.ok(JSON.parse(options.body).messages[0].content.includes(`in ${expected}`));
        return {ok:true,json:async()=>({message:{content:'{"recommendations":[{"event_id":"EV001","rationale":"Test"}]}'}})};
      },language);
    }
  } finally { for(const [k,v] of Object.entries(previous)) if(v===undefined)delete process.env[k];else process.env[k]=v; }
});
