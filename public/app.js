import { icon, esc, brand, heading, catalogSummary } from './components.js';
import { translateText } from './i18n.js';
import { readLanguage, writeLanguage, createTranslator, languagePicker } from './language.js';
import { readRoute, routeHash } from './routes.js';
let language = readLanguage({ getItem: key => localStorage.getItem(key) });
const translator = createTranslator(document, () => language);
let translationQueued = false;
new MutationObserver(() => {
  if (translationQueued) return;
  translationQueued = true;
  queueMicrotask(() => { translationQueued = false; translator.apply(); });
}).observe(document.body, { childList: true, subtree: true, characterData: true });
document.addEventListener('click', event => {
  const button = event.target.closest('[data-language]');
  if (!button || language === button.dataset.language) return;
  language = writeLanguage({ setItem: (key, value) => localStorage.setItem(key, value) }, button.dataset.language);
  translator.apply();
  if (user && view === 'activities' && data) renderActivityResults();
  if (user && view === 'hr' && hr) renderPeople();
  if (user && data && ['overview', 'preview'].includes(view)) {
    document.querySelector('dialog')?.close(); document.querySelector('dialog')?.remove();
    refreshRecommendations();
  }
});
translator.apply();
const app = document.querySelector('#app');
const date = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
let config = {};
const initials = name => String(name || 'Employee').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
let user, view = 'overview', data, recommendations, events = [], hr, selectedEmployee, activityFilter = 'all', search = '', hrFilter = 'all', requestId = 0;
let recommendationRequest = 0;
function restoreRoute() {
  const route = readRoute(location.hash, user.role);
  view = route.view; selectedEmployee = route.employee;
  history.replaceState(null, '', routeHash(view, selectedEmployee));
}
function navigate(nextView, employee = selectedEmployee) {
  const route = readRoute(routeHash(nextView, employee), user.role);
  view = route.view; selectedEmployee = route.employee; search = '';
  history.pushState(null, '', routeHash(view, selectedEmployee));
  document.querySelector('dialog')?.close(); document.querySelector('dialog')?.remove();
  load();
}
window.addEventListener('hashchange', () => {
  if (!user) return;
  restoreRoute(); search = '';
  document.querySelector('dialog')?.close(); document.querySelector('dialog')?.remove();
  load();
});
async function refreshRecommendations() {
  const section = document.querySelector('#recommendations');
  if (!section) return;
  const id = ++recommendationRequest, page = requestId, selectedLanguage = language;
  const query = new URLSearchParams({ lang: selectedLanguage });
  if (user.role === 'hr') query.set('employee_id', selectedEmployee);
  recommendations = null;
  section.innerHTML = '<div class="recommendation-loading"><span class="spinner"></span> Considering your skill gaps, history and activity formats…</div>';
  try {
    const result = await api(`/api/recommendations?${query}`);
    if (id !== recommendationRequest || page !== requestId || selectedLanguage !== language) return;
    recommendations = result; renderRecommendations();
  } catch (error) {
    if (id !== recommendationRequest || page !== requestId || selectedLanguage !== language) return;
    section.innerHTML = `<div class="empty">${esc(error.message)} <button class="text-button" id="retry-recommendations">Try again</button></div>`;
    document.querySelector('#retry-recommendations')?.addEventListener('click', refreshRecommendations);
  }
}
async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 5000);
}
function login() {
  user = null;
  app.innerHTML = `<main class="login"><section class="login-story"><a class="brand" href="/">${brand()}<span>career<span class="brand-light">quest</span><small>GROW WITH HALYK</small></span></a><div class="login-copy"><span class="eyebrow">YOUR POTENTIAL. YOUR PACE.</span><h1>Good things<br>are ahead.</h1><p>Turn your next step into a bigger picture.<br>A little clarity for your career journey.</p><div class="login-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-step step-one">01 <span>Discover</span></div><div class="art-step step-two">02 <span>Develop</span></div><div class="art-step step-three">03 <span>Thrive ${icon('star')}</span></div></div></div><div class="login-footer">Made for your growth. Built around you.</div></section><section class="login-form-wrap"><div class="login-form">${languagePicker()}<span class="pill pale">HackAlem AI · Halyk track</span><h2>Your next chapter<br>starts here.</h2><p class="muted">Sign in to your personal development space.</p><form id="login-form"><label for="username">Workspace</label><select id="username" name="username"><option value="employee">Employee · ${esc(config.employee_name || 'E0028')}</option><option value="hr">HR specialist</option></select><label for="password">Password</label><input id="password" type="password" name="password" value="grow-together" autocomplete="current-password" required><div id="login-error" role="alert"></div><button type="submit" class="button primary wide">Enter your workspace ${icon('arrow')}</button></form><div class="demo-note">${icon('leaf')}<div><strong>A safe space to explore</strong><p>This workspace uses ${config.employee_count || 200} synthetic profiles. Employee password: <code>grow-together</code>. HR password: <code>support-growth</code>.</p></div></div><div class="privacy-note">${icon('shield')} Your development profile stays private.</div></div></section></main>`;
  document.querySelector('#username').onchange = e => { document.querySelector('#password').value = e.target.value === 'hr' ? 'support-growth' : 'grow-together'; };
  document.querySelector('#login-form').onsubmit = async e => {
    e.preventDefault(); const button = e.target.querySelector('button'); button.disabled = true;
    try { user = await api('/api/login', Object.fromEntries(new FormData(e.target))); restoreRoute(); await load(); }
    catch (error) { document.querySelector('#login-error').textContent = error.message; button.disabled = false; }
  };
}
function navItem(id, name, symbol, extra = '') { return `<button class="nav-item ${view === id ? 'active' : ''}" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span data-i18n-key="nav.${id}">${name}</span>${extra}</button>`; }
function shell() {
  const isHR = user.role === 'hr';
  app.innerHTML = `<div class="layout"><aside class="sidebar"><a class="brand" href="/">${brand()}<span>career<span class="brand-light">quest</span><small>GROW WITH HALYK</small></span></a><div class="workspace-label">${isHR ? 'PEOPLE & DEVELOPMENT' : 'YOUR WORKSPACE'}</div><nav aria-label="Main navigation">${isHR ? navItem('hr', 'Team overview', 'home') + navItem('import', 'Data workspace', 'upload') : navItem('overview', 'Overview', 'home') + navItem('path', 'My growth path', 'path') + navItem('activities', 'Explore activities', 'book') + navItem('journal', 'My journey', 'clock')}</nav><div class="sidebar-bottom"><div class="gentle-note">${icon('leaf')}<strong>Small steps.<br>Meaningful growth.</strong><p>Your journey is your own.<br>Let’s make it a good one.</p></div><div class="sidebar-user"><span class="avatar small">${isHR ? 'HR' : esc(initials(user.name))}</span><span><strong ${isHR ? '' : 'data-no-i18n'}>${isHR ? 'HR workspace' : esc(user.name)}</strong><small>${isHR ? 'HR specialist' : 'Employee workspace'}</small></span><button class="icon-button" id="logout" aria-label="Sign out">${icon('out')}</button></div></div></aside><div class="main-wrap"><header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <strong>${({ overview: 'Overview', path: 'My growth path', activities: 'Explore activities', journal: 'My journey', hr: 'Team overview', import: 'Data workspace', preview: 'Profile preview' })[view]}</strong></div><div class="topbar-right">${languagePicker()}<button class="icon-button" id="mobile-logout" aria-label="Sign out">${icon('out')}</button><span class="private-label">${icon('shield')} ${isHR ? 'HR access' : 'Only visible to you & HR'}</span><span class="avatar">${isHR ? 'HR' : esc(initials(user.name))}</span></div></header><main id="content" tabindex="-1"></main><footer class="main-footer"><span>Career Quest <span class="footer-dot">·</span> A little progress, every day.</span><span>Synthetic dataset${config.snapshot_date ? ' \u00b7 ' + esc(config.snapshot_date) : ''}</span></footer></div></div>`;
  document.querySelectorAll('[data-view]').forEach(el => el.onclick = () => { navigate(el.dataset.view); });
  document.querySelectorAll('#logout, #mobile-logout').forEach(button => { button.onclick = async () => { try { await api('/api/logout', {}); ++requestId; login(); } catch (e) { toast(e.message); } }; });
}
async function load() {
  const id = ++requestId; shell();
  const content = document.querySelector('#content');
  content.innerHTML = '<div class="loading"><span class="spinner"></span> Finding your next step…</div>';
  try {
    if (user.role === 'hr' && ['hr', 'import'].includes(view)) {
      const summary = await api('/api/hr/summary'); if (id !== requestId) return; hr = summary;
      if (view === 'import') renderImport(); else renderHR();
    } else {
      const query = user.role === 'hr' ? `?employee_id=${encodeURIComponent(selectedEmployee)}` : '';
      const result = await Promise.all([api(`/api/profile${query}`), api(`/api/events${query}`)]);
      if (id !== requestId) return;
      [data, events] = result;
      recommendations = null; renderEmployee();
      if (['overview', 'preview'].includes(view)) {
        await refreshRecommendations();
      }
    }
  } catch (error) {
    if (id !== requestId) return;
    content.innerHTML = `<div class="empty"><h2>We couldn’t load this workspace.</h2><p>${esc(error.message)}</p><button class="button primary" id="retry">Try again</button></div>`;
    document.querySelector('#retry').onclick = load;
  } finally {
    if (id === requestId) document.querySelector('#content')?.focus({ preventScroll: true });
  }
}
function renderEmployee() {
  const employee = data.employee, path = data.trajectory;
  const content = document.querySelector('#content');
  if (view === 'activities') return renderActivities();
  if (view === 'journal') return renderJournal();
  if (view === 'path') return renderPath();
  content.innerHTML = heading('YOUR NEXT CHAPTER', `A little closer, ${esc((employee.name || employee.employee_id).split(' ')[0])}.`, 'Your ambitions, a clearer path. Here’s where you can grow next.', `<span class="date-label">${new Date(data.snapshot_date || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>`) +
    (view === 'preview' ? '<div class="preview-banner">HR preview · Read-only employee view. <button class="text-button" data-view="hr">Back to team overview</button></div>' : '') +
    `<div class="overview-grid"><section class="hero-card"><div class="hero-copy"><span class="pill hero-pill">${icon('path')} YOUR GROWTH PATH</span><h2>${path.next_grade ? `You’re building your<br>next chapter.` : 'Keep growing.<br>Keep exploring.'}</h2><p>${path.next_grade ? `From ${esc(employee.grade)} to ${esc(path.next_grade)} ${esc(path.target_role)}.<br>One meaningful step at a time.` : 'You’re at the highest defined grade. Explore skills beyond your current role.'}</p><button class="button light" data-view="path">See my growth path ${icon('arrow')}</button></div><div class="hero-visual"><div class="growth-orbit"></div><div class="growth-orbit inner"></div><div class="growth-line"></div><div class="growth-block block-one"><span>EXPLORE</span></div><div class="growth-block block-two"><span>DEVELOP</span></div><div class="growth-block block-three">${icon('star')}<span>THRIVE</span></div><span class="floating-star">✧</span><span class="floating-dot"></span></div><div class="hero-bottom"><span class="live-dot"></span> Built around your skills, experience & ambitions</div></section><section class="readiness-card"><div class="card-top"><h3>Your next level</h3><span class="tiny-tag">${esc(path.next_grade || 'Top grade')}</span></div><div class="progress-ring" style="--progress:${path.readiness || 0}"><div><strong>${path.readiness === null ? '—' : `${path.readiness}<span>%</span>`}</strong><small>skill readiness</small></div></div><p>${path.gap_count ? `<strong>${path.gap_count} skills</strong> to develop for your next grade` : path.next_grade ? 'Your defined skill targets are met' : 'No next-grade target defined'}</p><div class="readiness-bottom">A guide for growth, not a promotion decision.</div></section></div><div class="stats-row"><div class="stat"><span class="stat-icon green">${icon('check')}</span><div><strong>${data.completion_count ?? data.history.filter(h => h.status === 'completed').length}<small>Activities completed</small></strong></div><span class="stat-detail">Your experience so far</span></div><div class="stat"><span class="stat-icon peach">${icon('book')}</span><div><strong>${data.enrollments.length}<small>Steps in progress</small></strong></div><span class="stat-detail">At your own pace</span></div><div class="stat"><span class="stat-icon lavender">${icon('star')}</span><div><strong>${Object.keys(employee.skills).length}<small>Skills in your toolkit</small></strong></div><span class="stat-detail">Room to keep growing</span></div></div><section class="recommendation-section"><div class="section-heading"><div><h2>Good next steps ${icon('star')}</h2><p>Chosen for where you are — and where you want to go.</p></div><button class="text-button" data-view="activities">Explore all activities ${icon('arrow')}</button></div><div id="recommendations"><div class="recommendation-loading"><span class="spinner"></span> Considering your skill gaps, history and activity formats…</div></div></section><section class="bottom-grid"><div class="panel skills-panel"><div class="section-heading"><h2>Skills to take you further</h2><button class="text-button" data-view="path">View path ${icon('arrow')}</button></div>${skillBars(path.skills.filter(s => s.target > s.current).slice(0, 3))}</div><div class="reflection-card"><span class="eyebrow">A MOMENT TO REFLECT</span><h2>Progress isn’t<br>always a straight line.</h2><p>Trying something new counts. So does finding out what works for you.</p><span class="reflection-leaf">${icon('leaf')}</span><button class="text-button" data-view="journal">Look back at your journey ${icon('arrow')}</button></div></section>`;
  bindNavigation();
}
function skillBars(skills) {
  if (!skills.length) return '<p class="muted">You’ve met the defined skill targets. Take a moment to enjoy your progress.</p>';
  return skills.map(s => `<div class="skill-row"><div class="skill-label"><strong><span>${esc(s.name)}</span>${s.critical ? '<span> · Critical</span>' : ''}</strong><span><b>${s.current}</b> / ${s.target} target</span></div><div class="skill-track"><span style="width:${s.current * 20}%"></span><i style="left:${Math.min(s.target * 20, 99)}%" title="Target level ${s.target}"></i></div></div>`).join('');
}
function renderRecommendations() {
  const el = document.querySelector('#recommendations'); if (!el) return;
  el.innerHTML = `<div class="engine-note"><span class="engine-dot"></span>${recommendations.mode === 'openai' ? 'OPENAI RECOMMENDATIONS' : recommendations.mode === 'local_ai' ? 'LOCAL AI RECOMMENDATIONS' : 'MULTI-FACTOR RECOMMENDATIONS'}<span>${esc(recommendations.note)}</span></div><div class="recommendation-grid">${recommendations.recommendations.map((e, i) => activityCard(e, i, true)).join('') || '<div class="empty">No remaining eligible activities close your next-grade gaps. Explore the activity library for other development opportunities.</div>'}</div>`;
  bindActivities(el);
}
function activityCard(event, index, recommended = false) {
  const enrolled = data.enrollments.some(e => e.event_id === event.event_id);
  const completed = !event.recurring && data.history.some(e => e.event_id === event.event_id && e.status === 'completed');
  const colors = ['sage', 'sand', 'lilac'];
  const actual = event.changes?.filter(c => c.after > c.before) || [];
  return `<article class="activity-card"><div class="activity-top"><span class="activity-icon ${colors[index % 3]}">${icon(({ workshop: 'people', course: 'book', mentoring: 'people', lab: 'shield', challenge: 'path' })[event.type] || 'book')}</span><span class="activity-type">${esc(event.type)} <span>·</span> ${event.duration_hours}h</span>${recommended && index === 0 ? '<span class="best-fit">TOP PICK</span>' : ''}</div><h3>${esc(event.title)}</h3>${event.auto_generated ? '<span class="pill pale">Automatically added practice</span>' : ''}<p class="activity-description">${esc(event.description || 'A practical opportunity to develop your skills.')}</p><div class="gain-tags">${actual.map(c => `<span>${esc(c.name || c.skill_id)} <b>+${c.after - c.before}</b></span>`).join('') || '<span>Practice & reinforce</span>'}</div>${recommended ? `<div class="why-preview">${icon('star')}<p>${esc(event.evidence[0])}</p></div>` : ''}<div class="activity-bottom"><button class="text-button" data-detail="${esc(event.event_id)}">${recommended ? 'Why this step?' : 'View details'} ${icon('chevron')}</button>${user.role === 'hr' ? '<span class="muted">Preview only</span>' : completed ? `<span class="completed-label">${icon('check')} Completed</span>` : `<button class="button ${enrolled ? 'secondary' : 'primary'} compact" data-${enrolled ? 'detail' : 'join'}="${esc(event.event_id)}">${enrolled ? 'In progress' : 'Join activity'} ${icon(enrolled ? 'clock' : 'arrow')}</button>`}</div></article>`;
}
function bindNavigation() { document.querySelectorAll('#content [data-view]').forEach(el => el.onclick = () => { navigate(el.dataset.view); }); }
function bindActivities(root = document) {
  root.querySelectorAll('[data-detail]').forEach(el => el.onclick = () => openActivity(el.dataset.detail));
  root.querySelectorAll('[data-join]').forEach(el => el.onclick = () => activityAction('enroll', el.dataset.join, el));
}
async function activityAction(action, id, button) {
  button.disabled = true;
  try {
    const result = await api(`/api/${action}`, { event_id: id });
    document.querySelector('dialog')?.close(); document.querySelector('dialog')?.remove();
    toast(action === 'complete' ? `Step completed. ${result.changes.filter(c => c.after > c.before).length} skill(s) progressed. Your path is updated.` : action === 'withdraw' ? 'Activity removed from your plan. Choose a step that works for you.' : 'Added to your plan. Your next step is ready when you are.');
    await load();
  } catch (error) { toast(error.message); button.disabled = false; }
}
function showDialog(html) {
  document.querySelector('dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.innerHTML = `<button class="close-dialog icon-button" aria-label="Close dialog">×</button>${html}`;
  document.body.append(dialog); dialog.showModal();
  dialog.querySelector('.close-dialog').onclick = () => { dialog.close(); dialog.remove(); };
  dialog.onclick = e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { dialog.close(); dialog.remove(); } } };
  return dialog;
}
function openActivity(id) {
  const event = recommendations?.recommendations.find(e => e.event_id === id) || events.find(e => e.event_id === id);
  if (!event) return;
  const enrolled = data.enrollments.some(e => e.event_id === id), completed = !event.recurring && data.history.some(h => h.event_id === id && h.status === 'completed');
  const dialog = showDialog(`<span class="eyebrow">${esc(event.type)} · ${event.duration_hours} HOURS · VOLUNTARY</span><h2>${esc(event.title)}</h2>${event.auto_generated ? '<div class="preview-banner">Automatically added practice</div><p class="muted">Suggested self-study, not a scheduled provider course. Save your work and check it against the task before marking completion. Completion is self-reported in this demo.</p>' : ''}<p class="muted">${esc(event.description || '')}</p>${event.ai_rationale ? `<div class="ai-rationale"><h3>${icon('star')} ${recommendations?.mode === 'openai' ? 'OpenAI' : 'Local AI'} reasoning</h3><p data-no-i18n>${esc(event.ai_rationale)}</p><small>Model-generated explanation; check the verified evidence below.</small></div>` : ''}${event.evidence ? `<h3>Why this step fits</h3><ul class="evidence-list">${event.evidence.map(e => `<li>${esc(e)}</li>`).join('')}</ul><p class="score-note">Multi-factor score: ${event.score}. Considers gap closure, gap size, participation history, format and effort.</p>` : ''}${event.caution ? `<div class="caution">${esc(event.caution)}</div>` : ''}${event.format ? `<p class="muted">Format: ${esc(event.format.replace('_', ' '))}${event.recurring ? ' · Recurring activity' : ''}${event.upcoming_sessions?.length ? ' · Next sessions: ' + event.upcoming_sessions.slice(0, 3).map(date).join(', ') : ''}</p>` : ''}<h3>What changes when you complete it</h3><div class="change-list">${event.changes.map(c => `<div><span>${esc(c.name || c.skill_id)}</span><strong>${c.before} ${icon('arrow')} ${c.after}</strong><small>Gain ${c.gain}, activity cap ${c.max_level}, scale 0–5</small></div>`).join('')}</div><p class="formula">New level = max(current, min(5, activity cap, current + gain)). Your level never decreases.</p><div class="dialog-actions">${user.role === 'hr' ? '<p class="muted">HR preview is read-only.</p>' : completed ? `<span class="completed-label">${icon('check')} Already completed</span>` : enrolled ? `<p class="muted">Demo: completion is self-reported and immediately updates your skills.</p><button class="button primary" id="complete" ${event.available === false ? 'disabled' : ''}>${icon('check')} Mark as completed</button><button class="text-button" id="withdraw">Leave activity</button>` : `<button class="button primary" data-join="${esc(id)}">Add to my plan ${icon('arrow')}</button>`}</div>`);
  bindActivities(dialog);
  dialog.querySelector('#complete')?.addEventListener('click', e => activityAction('complete', id, e.currentTarget));
  dialog.querySelector('#withdraw')?.addEventListener('click', e => activityAction('withdraw', id, e.currentTarget));
}
function renderPath() {
  const e = data.employee, p = data.trajectory;
  document.querySelector('#content').innerHTML = heading('YOUR GROWTH PATH', 'Make your potential visible.', 'A clearer view of the skills that connect today to your next chapter.') + `<section class="panel path-banner"><div><span class="eyebrow">WHERE YOU ARE</span><h2>${esc(e.grade)} ${esc(e.role)}</h2><p class="muted">${e.tenure_months} months of experience here</p></div>${icon('arrow')}<div><span class="eyebrow">WHAT YOU’RE WORKING TOWARD</span><h2>${esc(p.next_grade || 'Continued mastery')} ${p.next_grade ? esc(p.target_role) : ''}</h2><p class="muted">${p.readiness === null ? 'No target requirements defined' : `${p.readiness}% of defined skill requirements met · ${p.critical_gap_count || 0} critical gaps`}</p></div></section><section class="panel"><div class="section-heading"><div><h2>Your skill map</h2><p>Current levels and the requirements for ${esc(p.next_grade || 'your current grade')} ${esc(p.target_role)}.</p></div><span class="legend"><i></i> Current <b></b> Target</span></div><div class="skill-map">${skillBars(p.skills)}</div>${e.last_review_date ? `<p class="muted">Assessment: ${date(e.last_review_date)}. ${e.applied_history_ids?.length || 0} completed activities after that date are reflected in current levels. Snapshot: ${esc(data.snapshot_date || 'live')}.</p>` : ''}<div class="explainer">${icon('shield')}<div><strong>Progress you can understand</strong><p>Readiness = the sum of current levels, capped at each target, divided by the sum of target levels. Only skills tracked in your profile or explicitly required for your role are included. Readiness is a development guide, not an automatic promotion decision.</p></div></div></section><section class="panel next-step-panel"><div><h2>Your next step is yours to choose.</h2><p class="muted">Browse voluntary opportunities that fit your goals and your schedule.</p></div><button class="button primary" data-view="activities">Explore activities ${icon('arrow')}</button></section>`;
  bindNavigation();
}
function renderActivities() {
  document.querySelector('#content').innerHTML = heading('MAKE ROOM TO GROW', 'Find your next spark.', 'Workshops, mentoring and practical experiences. Choose what works for you.') + `<div class="filter-toolbar"><div class="filter-tabs">${['all', ...new Set(events.map(e => e.type)), 'joined'].map(type => `<button class="filter-tab ${activityFilter === type ? 'selected' : ''}" data-filter="${esc(type)}">${esc(type === 'all' ? 'All activities' : type === 'joined' ? 'My plan' : type[0].toUpperCase() + type.slice(1))}</button>`).join('')}</div><label class="search-field">${icon('search')}<input type="search" id="activity-search" placeholder="Search activities" aria-label="Search activities" value="${esc(search)}"></label></div><p class="results-count" id="results-count"></p><div class="activity-grid" id="activity-results"></div>`;
  document.querySelectorAll('[data-filter]').forEach(el => el.onclick = () => { activityFilter = el.dataset.filter; renderActivities(); });
  document.querySelector('#activity-search').oninput = e => { search = e.target.value; renderActivityResults(); };
  renderActivityResults();
}
function renderActivityResults() {
  const filtered = events.filter(e => (activityFilter === 'all' || (activityFilter === 'joined' ? e.joined : e.type === activityFilter)) && [e.title, e.description, ...e.changes.map(c => c.name)].flatMap(text => [text || '', translateText(text || '', language)]).join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  document.querySelector('#results-count').textContent = `${filtered.length} opportunities for you`;
  const el = document.querySelector('#activity-results'); el.innerHTML = filtered.map((e, i) => activityCard(e, i)).join('') || '<div class="empty">No matching activities. Try another filter or add an activity to your plan.</div>';
  bindActivities(el);
}
function renderJournal() {
  document.querySelector('#content').innerHTML = heading('EVERY STEP TELLS A STORY', 'Look how far you’ve come.', 'Your development history, without comparisons or leaderboards.') + `<section class="panel"><div class="section-heading"><h2>My journey</h2><span class="muted">${data.history.length} recorded activities</span></div><div class="timeline">${data.history.map(h => `<div class="timeline-item"><span class="timeline-marker ${h.status === 'completed' ? 'done' : ''}">${icon(h.status === 'completed' ? 'check' : 'clock')}</span><div><span class="timeline-date">${date(h.date)}</span><h3>${esc(h.title || h.event_id)}</h3><p class="muted">${({ completed: 'Completed', no_show: 'Did not attend', declined: 'Chose not to attend', registered: 'Registered', in_progress: 'In progress', dropped: 'Left before completing', overdue: 'Overdue' })[h.status]}${h.status === 'completed' && h.on_time ? ' · On time' : ''}</p>${h.changes ? `<div class="gain-tags">${h.changes.filter(c => c.after > c.before).map(c => `<span>${esc(data.trajectory.skills.find(s => s.skill_id === c.skill_id)?.name || c.skill_id)} +${c.after - c.before}</span>`).join('')}</div>` : ''}</div></div>`).join('') || '<div class="empty">Your story starts with your first activity.</div>'}</div></section>`;
}
function renderHR() {
  document.querySelector('#content').innerHTML = heading('HELP YOUR PEOPLE THRIVE', 'Growth starts with understanding.', 'See where support can make a difference. Give every journey room to grow.', '<button class="button primary" data-view="import">'+icon('upload')+' Import dataset</button>') + catalogSummary(hr.catalog) + `<div class="hr-stats"><div class="panel metric"><span>People in your workspace</span><strong>${hr.total}</strong><small>Synthetic employee profiles</small></div><div class="panel metric"><span>Active in development</span><strong>${hr.active}</strong><small>Completed an activity in 90 days</small></div><div class="panel metric"><span>Activity completion</span><strong>${hr.completion_rate}%</strong><small>Across records in the last 90 days</small></div><div class="panel metric peach-metric"><span>May benefit from support</span><strong>${hr.needs_support}</strong><small>A conversation, not a risk label</small></div></div><section class="panel"><div class="section-heading"><div><h2>Where to invest in growth</h2><p>Skills below next-grade requirements across applicable profiles.</p></div><span class="pill pale">Team skill gaps</span></div><div class="hr-gap-grid">${hr.gaps.slice(0, 6).map(g => `<div class="skill-row"><div class="skill-label"><strong>${esc(g.name)}</strong><span>${g.count} / ${g.total} people</span></div><div class="skill-track"><span style="width:${g.percent}%"></span></div><small class="muted">${g.percent}% below their target</small></div>`).join('')}</div></section><section class="panel people-panel"><div class="section-heading"><div><h2>People & their paths</h2><p>Alphabetical view · visible only to HR</p></div><label class="search-field">${icon('search')}<input type="search" id="people-search" placeholder="Find a colleague" aria-label="Find a colleague"></label></div><div class="filter-tabs hr-filter"><button class="filter-tab ${hrFilter === 'all' ? 'selected' : ''}" data-hr-filter="all">Everyone</button><button class="filter-tab ${hrFilter === 'support' ? 'selected' : ''}" data-hr-filter="support">May need support</button></div><div class="table-scroll"><table><thead><tr><th>Colleague</th><th>Department</th><th>Current grade</th><th>Skill readiness</th><th>Development</th><th><span class="sr-only">Open profile</span></th></tr></thead><tbody id="people-rows"></tbody></table></div><p class="results-count" id="people-count"></p></section><div class="privacy-note hr-privacy">${icon('shield')} Support signals reflect activity history, not employee performance or attrition predictions.</div>`;
  bindNavigation();
  document.querySelector('#people-search').oninput = e => { search = e.target.value; renderPeople(); };
  document.querySelectorAll('[data-hr-filter]').forEach(el => el.onclick = () => { hrFilter = el.dataset.hrFilter; renderHR(); });
  document.querySelector('#people-search').value = search;
  renderPeople();
}
function renderPeople() {
  const people = hr.people.filter(p => (hrFilter === 'all' || p.needs_support) && [p.name, p.employee_id, p.department, p.role].flatMap(value => [value || '', translateText(value || '', language)]).join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a, b) => (a.name || a.employee_id).localeCompare(b.name || b.employee_id));
  document.querySelector('#people-rows').innerHTML = people.map(p => `<tr><td><strong data-no-i18n>${esc(p.name || p.employee_id)}</strong><small>${esc(p.employee_id)} · ${esc(p.role)}</small></td><td>${esc(p.department || 'Unassigned')}</td><td><span class="grade-tag">${esc(p.grade)}</span></td><td><div class="table-progress"><span style="width:${p.readiness || 0}%"></span></div>${p.readiness === null ? '—' : p.readiness + '%'}</td><td><span class="status ${p.needs_support ? 'support' : 'active-status'}" title="${esc(p.needs_support ? p.support_reason : 'Recent completed activity')}">${p.needs_support ? 'Offer support' : 'Active'}</span></td><td><button class="icon-button" data-preview="${esc(p.employee_id)}" aria-label="View ${esc(p.name || p.employee_id)} profile">${icon('arrow')}</button></td></tr>`).join('') || '<tr><td colspan="6">No matching colleagues.</td></tr>';
  document.querySelector('#people-count').textContent = `${people.length} colleagues`;
  document.querySelectorAll('[data-preview]').forEach(el => el.onclick = () => { navigate('preview', el.dataset.preview); });
}
function renderImport() {
  document.querySelector('#content').innerHTML = heading('BRING THE BIGGER PICTURE', 'A home for your development data.', 'Import starter-kit or jury profiles and history. Validate everything before applying it.') + `<div class="import-grid"><section class="panel"><h2>Upload a dataset</h2><p class="muted">Select a combined JSON dataset, or select the starter-kit files together. Maximum request size: 8 MB.</p><label class="upload-zone" for="dataset-files">${icon('upload')}<strong>Choose your dataset files</strong><span>JSON or CSV · you can select multiple files</span><input id="dataset-files" type="file" accept=".json,.csv" multiple></label><div id="import-files" class="muted"></div><div id="import-feedback" role="status"></div><div class="import-actions"><button class="button primary" id="validate-import" disabled>Validate files ${icon('check')}</button><button class="button secondary" id="apply-import" disabled>Import validated data ${icon('arrow')}</button></div></section><aside class="panel import-help"><span class="pill pale">Jury-ready workflow</span><h2>Connect the context.</h2><ul><li><strong>employees.json</strong><span>Role, grade, tenure and current skill levels.</span></li><li><strong>events.json</strong><span>Audience, activity type, skill gains and caps.</span></li><li><strong>skills.json</strong><span>Skill definitions and grade requirements.</span></li><li><strong>activity_history.csv</strong><span>Participation, no-shows and declined activities.</span></li></ul><p class="muted">Profiles, skills and events merge by ID. Uploaded history replaces the history of employees represented in that file. For starter-kit profiles, completed activities dated after the last review are applied once to the assessment baseline, respecting skill caps.</p><p>Dataset export excludes personal plans. Use a full backup to restore all data.</p><button class="text-button" id="export-backup">Download full backup</button><button id="export-data" class="text-button">Download current dataset ${icon('arrow')}</button></aside></div><div class="explainer">${icon('shield')}<div><strong>Your data & AI provider</strong><p>Dataset files are stored on this server. ${config.ai?.provider === 'openai' ? 'OpenAI mode sends role, skills, career goals and activity evidence to the OpenAI API. Employee names, IDs and raw history are excluded.' : 'Recommendations use local rules or a locally configured Ollama model.'}</p></div></div>`;
  let pending, validated, generation = 0, validationRequest = 0, applying = false;
  const feedback = document.querySelector('#import-feedback'), validate = document.querySelector('#validate-import'), apply = document.querySelector('#apply-import');
  const picker = document.querySelector('#dataset-files');
  const showError = error => {
    feedback.className = 'error-box';
    feedback.textContent = error instanceof SyntaxError ? 'Invalid JSON file. Check its syntax and try again.' : error.message;
  };
  picker.onchange = async e => {
    if (applying) return;
    const selected = ++generation;
    ++validationRequest;
    pending = null; validated = null; apply.disabled = true; validate.disabled = true; feedback.textContent = '';
    apply.textContent = 'Import validated data';
    const files = [...e.target.files];
    document.querySelector('#import-files').textContent = files.map(f => `${f.name} (${Math.ceil(f.size / 1024)} KB)`).join(' · ');
    if (!files.length) return;
    try {
      if (files.reduce((n, f) => n + f.size, 0) > 7 * 1024 * 1024) throw new Error('Select files totaling at most 7 MB (8 MB request limit).');
      let payload;
      if (files.length === 1 && files[0].name.endsWith('.json')) {
        const parsed = JSON.parse((await files[0].text()).replace(/^\uFEFF/, ''));
        payload = parsed?.kind === 'career-quest-backup' || (!Array.isArray(parsed) && ['employees', 'events', 'skills', 'history', 'activity_history'].some(k => parsed?.[k] !== undefined)) ? { dataset: parsed } : { files: [{ name: files[0].name, text: JSON.stringify(parsed) }] };
      } else payload = { files: await Promise.all(files.map(async f => ({ name: f.name, text: await f.text() }))) };
      if (selected !== generation) return;
      pending = payload;
      validate.disabled = false;
    } catch (error) { if (selected === generation) showError(error); }
  };
  validate.onclick = async () => {
    if (!pending || applying || validate.disabled) return;
    const selected = generation, request = ++validationRequest, payload = structuredClone(pending);
    validated = null; validate.disabled = true; apply.disabled = true;
    try {
      const result = await api('/api/hr/import', { ...payload, preview: true });
      if (selected !== generation || request !== validationRequest) return;
      validated = { ...result, payload, generation: selected };
      feedback.className = 'success-box';
      feedback.textContent = `Validation passed. Result: ${result.counts.employees} profiles, ${result.counts.events} events, ${result.counts.skills} skills and ${result.counts.history} history records. Ready to import.`;
      if (result.added_practice) feedback.textContent += ' Additional guided practice will be added to cover catalog gaps.';
      if (result.duplicate_completions) feedback.textContent += ' Duplicate completions do not grant extra skill gains.';
      if (result.restoring) feedback.textContent += ' Restoring this backup replaces all current data and personal plans.';
      apply.textContent = result.restoring ? 'Restore full backup' : 'Import validated data';
      apply.disabled = false;
    } catch (error) { if (selected === generation && request === validationRequest) showError(error); }
    finally { if (selected === generation && request === validationRequest) validate.disabled = false; }
  };
  apply.onclick = async () => {
    if (applying || apply.disabled || !validated || validated.generation !== generation) return;
    const snapshot = validated;
    validated = null; applying = true; picker.disabled = true;
    apply.disabled = true; validate.disabled = true;
    try {
      const result = await api('/api/hr/import', { ...snapshot.payload, revision: snapshot.revision });
      feedback.className = 'success-box'; feedback.textContent = result.message + ' Open Team overview to inspect imported profiles.'; toast(result.message);
    } catch (error) { showError(error); validate.disabled = false; }
    finally { applying = false; picker.disabled = false; }
  };
  for (const [id, endpoint, filename] of [['export-data', 'export', 'career-quest-dataset.json'], ['export-backup', 'backup', 'career-quest-backup.json']]) document.querySelector('#' + id).onclick = async () => {
    try { const dataset = await api('/api/hr/' + endpoint); const url = URL.createObjectURL(new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (error) { toast(error.message); }
  };
}
(async () => { try { config = await api('/api/config'); user = await api('/api/me'); restoreRoute(); await load(); } catch { login(); } })();
