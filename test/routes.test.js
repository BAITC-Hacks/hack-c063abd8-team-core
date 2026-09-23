import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoute, routeHash } from '../public/routes.js';

test('screen links round trip and enforce role-appropriate pages', () => {
  for (const view of ['overview','path','activities','journal']) assert.deepEqual(readRoute(routeHash(view), 'employee'), { view, employee: null });
  assert.deepEqual(readRoute('#/preview?employee=E0028', 'hr'), { view: 'preview', employee: 'E0028' });
  assert.equal(readRoute('#/hr', 'employee').view, 'overview');
  assert.equal(readRoute('#/preview?employee=../secret', 'hr').view, 'hr');
  assert.equal(readRoute('#/unknown', 'hr').view, 'hr');
  assert.equal(readRoute('#/import', 'hr').view, 'import');
  assert.deepEqual(readRoute(routeHash('path', 'E0028'), 'hr'), { view: 'path', employee: 'E0028' });
  assert.deepEqual(readRoute(routeHash('path', 'E0028'), 'employee'), { view: 'path', employee: null });
});
