import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const [requestPath, target, baseline] = process.argv.slice(2);
const request = JSON.parse(readFileSync(requestPath, 'utf8'));
assert.equal(Object.keys(request).sort().join(','), 'base,client,kind,maximumAttempts');
assert.equal(request.client, 'missy');
assert.equal(request.kind, 'set-development-retry-limit');
assert(Number.isInteger(request.maximumAttempts) && request.maximumAttempts >= 1 && request.maximumAttempts <= 3);
const source = readFileSync(baseline, 'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'), request.base);
const oldLine = /^export const maximumAttempts = [123];$/gm;
assert.equal([...source.matchAll(oldLine)].length, 1);
const candidate = source.replace(oldLine, 'export const maximumAttempts = ' + request.maximumAttempts + ';');
assert.notEqual(candidate, source);
writeFileSync(target, candidate, { flag: 'wx' });
