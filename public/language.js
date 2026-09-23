import { normalizeLanguage, translateText, translateKey } from './i18n.js';

export function readLanguage(storage) {
  try { return normalizeLanguage(storage.getItem('career-quest-language')); } catch { return 'en'; }
}
export function writeLanguage(storage, value) {
  const language = normalizeLanguage(value);
  try { storage.setItem('career-quest-language', language); } catch { /* Private browsing can disable storage. */ }
  return language;
}

// Keep English source text separate from rendered text so switching is reversible.
// Only text/accessible labels change: no innerHTML rewriting or event rebinding.
export function createTranslator(document, getLanguage) {
  const records = new WeakMap();
  function update(node, key, read, write) {
    const value = read();
    const fields = records.get(node) || {};
    let field = fields[key];
    if (!field || field.rendered !== value) field = { source: value };
    const translated = translateText(field.source, getLanguage());
    field.rendered = translated; fields[key] = field; records.set(node, fields);
    if (value !== translated) write(translated);
  }
  function visit(node) {
    if (node.nodeType === 1 && (node.matches('script,style,code,textarea,[data-no-i18n]') || node.namespaceURI === 'http://www.w3.org/2000/svg')) return;
    if (node.nodeType === 1 && node.hasAttribute('data-i18n-key')) {
      const translated = translateKey(node.getAttribute('data-i18n-key'), getLanguage());
      if (translated !== undefined) {
        if (node.textContent !== translated) node.textContent = translated;
        return;
      }
    }
    if (node.nodeType === 3) {
      update(node, 'text', () => node.nodeValue, value => { node.nodeValue = value; });
      return;
    }
    if (node.nodeType === 1) for (const attr of ['placeholder', 'aria-label', 'title']) if (node.hasAttribute(attr)) update(node, attr, () => node.getAttribute(attr), value => node.setAttribute(attr, value));
    for (const child of node.childNodes || []) visit(child);
  }
  function apply() {
    document.documentElement.lang = getLanguage();
    document.title = `Career Quest · ${translateText('Your next chapter', getLanguage())}`;
    visit(document.body);
    document.querySelectorAll('[data-language]').forEach(button => {
      const active = button.dataset.language === getLanguage();
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('selected', active);
    });
  }
  return { apply };
}

export function languagePicker() {
  return `<div class="language-picker" role="group" aria-label="Language"><button type="button" data-language="en" lang="en" aria-label="English">EN</button><button type="button" data-language="ru" lang="ru" aria-label="Русский">RU</button><button type="button" data-language="kk" lang="kk" aria-label="Қазақша">KZ</button></div>`;
}
