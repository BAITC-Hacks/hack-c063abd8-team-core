export function readRoute(hash, role) {
  const fallback = { view: role === 'hr' ? 'hr' : 'overview', employee: null };
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const employeeViews = ['preview', 'path', 'activities', 'journal'];
  const allowed = role === 'hr' ? ['hr', 'import', ...employeeViews] : ['overview', 'path', 'activities', 'journal'];
  if (!allowed.includes(path)) return fallback;
  const employee = new URLSearchParams(query).get('employee');
  const needsEmployee = role === 'hr' && employeeViews.includes(path);
  if (needsEmployee && !/^[A-Za-z0-9_-]{1,80}$/.test(employee || '')) return fallback;
  return { view: path, employee: needsEmployee ? employee : null };
}
export const routeHash = (view, employee) => `#/${view}${employee ? `?employee=${encodeURIComponent(employee)}` : ''}`;
