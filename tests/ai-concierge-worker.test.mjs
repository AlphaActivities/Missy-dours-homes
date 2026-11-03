import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/concierge-worker.js';

const secret = 'integration-test-secret';
function request(body, authorized = true) {
  return new Request('https://example.test/internal/reply', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorized ? { authorization: 'Bearer ' + secret } : {})
    },
    body: JSON.stringify(body)
  });
}

test('Worker rejects requests without a bridge secret', async () => {
  const response = await worker.fetch(request({ messages: [{ role:'user',content:'hello' }] }, false), {
    CONCIERGE_BRIDGE_SECRET: secret,
    AI: { run: async () => ({response:'not reached'}) }
  });
  assert.equal(response.status, 401);
});

test('Automatic Spanish detection grounds replies in website facts without claiming listing availability', async () => {
  let calls = [];
  const env = {
    CONCIERGE_BRIDGE_SECRET: secret,
    AI: {
      run: async (_model, opts) => {
        calls.push(opts);
        return { response: calls.length === 1 ? 'es' : 'Puedes consultar el sitio web.' };
      }
    }
  };
  const response = await worker.fetch(request({
    language: 'auto',
    messages: [{role:'user',content:'¿Me puedes contar sobre una propiedad en Farmers Branch?'}]
  }), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.language, 'es');
  assert.equal(body.reply, 'Puedes consultar el sitio web.');
  assert.equal(calls.length, 2);
  assert.match(calls[1].messages[0].content, /^Reply in Spanish\./);
  assert.match(calls[1].messages[1].content, /14636 Southern Pines Dr/);
  assert.match(calls[1].messages[1].content, /do not assert them as current/i);
  assert.match(calls[1].messages[1].content, /Representative Example/);
});

test('Uncertain language detection fails back to English', async () => {
  let calls = [];
  const response = await worker.fetch(request({
    language: 'auto',
    messages: [{role:'user',content:'hello'}]
  }), {
    CONCIERGE_BRIDGE_SECRET: secret,
    AI: { run: async (_model,opts) => {
      calls.push(opts);
      return {response:calls.length===1?'nonsense':'Hello!'};
    }}
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).language, 'en');
  assert.match(calls[1].messages[0].content,/^Reply in English\./);
});
