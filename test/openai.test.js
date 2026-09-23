import test from 'node:test';
import assert from 'node:assert/strict';
import { aiRecommendations } from '../lib/ai.js';
import { createSeed } from '../lib/seed.js';
import { recommend } from '../lib/domain.js';

test('OpenAI Responses request is structured, omits identity and validates model output', async () => {
  const previous = { AI_PROVIDER: process.env.AI_PROVIDER, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  process.env.AI_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
  const state = createSeed(), employee = state.employees[27], candidates = recommend(state, employee);
  const response = recommendations => ({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ recommendations }) }] }] }) });
  try {
    const result = await aiRecommendations(employee, candidates, async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/responses');
      assert.equal(options.headers.Authorization, 'Bearer test-only-not-a-real-key');
      assert.equal(options.redirect, 'error');
      const request = JSON.parse(options.body);
      assert.equal(request.store, false); assert.equal(request.text.format.strict, true);
      assert.ok(request.text.format.schema.properties.recommendations.items.properties.event_id.enum.includes('EV001'));
      assert.ok(!options.body.includes(employee.employee_id)); assert.ok(!options.body.includes(employee.name));
      return response([{ event_id: 'EV001', rationale: 'Closes a critical target gap and fits the profile history.' }]);
    });
    assert.equal(result.mode, 'openai'); assert.equal(result.recommendations[0].event_id, 'EV001');
    const fabricated = await aiRecommendations(employee, candidates, async () => response([{ event_id: 'EV_FAKE', rationale: 'No.' }]));
    assert.equal(fabricated.mode, 'rules');
    const duplicate = await aiRecommendations(employee, candidates, async () => response([{ event_id: 'EV001', rationale: 'One' }, { event_id: 'EV001', rationale: 'Two' }]));
    assert.equal(duplicate.mode, 'rules');
    const quota = await aiRecommendations(employee, candidates, async () => ({ ok: false, status: 429 }));
    assert.match(quota.note, /quota/); assert.ok(!JSON.stringify(quota).includes(process.env.OPENAI_API_KEY));
    delete process.env.OPENAI_API_KEY;
    const missing = await aiRecommendations(employee, candidates, async () => { assert.fail('Missing key must not make a request.'); });
    assert.match(missing.note, /not configured/);
  } finally { for (const [k, v] of Object.entries(previous)) if (v === undefined) delete process.env[k]; else process.env[k] = v; }
});
