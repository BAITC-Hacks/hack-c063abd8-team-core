import test from 'node:test';
import assert from 'node:assert/strict';
import { redactSecrets } from '../lib/secrets.js';

test('redacts configured secrets in JSON values, keys and escaped strings', () => {
  const previous = process.env.OPENAI_API_KEY;
  try {
    for (const secret of ['test-secret', 'test-"secret\\with\ncharacters']) {
      process.env.OPENAI_API_KEY = secret;
      const output = JSON.parse(redactSecrets(JSON.stringify({ [secret]: `Bearer ${secret}`, nested: [secret] })));
      assert.deepEqual(output, { '[REDACTED]': 'Bearer [REDACTED]', nested: ['[REDACTED]'] });
    }
    delete process.env.OPENAI_API_KEY;
    assert.equal(redactSecrets('ordinary content'), 'ordinary content');
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});
