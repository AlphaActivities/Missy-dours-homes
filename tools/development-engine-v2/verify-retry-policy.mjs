import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [requestPath, target, baseline] = process.argv.slice(2);
const { maximumAttempts } = JSON.parse(readFileSync(requestPath, 'utf8'));
const reviewedSource = `export const maximumAttempts = ${maximumAttempts};

export function mayRetry(completedAttempts) {
  return Number.isInteger(completedAttempts) && completedAttempts >= 0 && completedAttempts < maximumAttempts;
}
`;
assert.equal(readFileSync(target, 'utf8'), reviewedSource);
assert.equal(readFileSync(baseline, 'utf8').replace(/^export const maximumAttempts = [123];$/m,
  'export const maximumAttempts = ' + maximumAttempts + ';'), reviewedSource);
const candidate = await import(pathToFileURL(target));
assert.equal(candidate.maximumAttempts, maximumAttempts);
for (const attempts of [-1, 0, 1, 2, 3, 4, 0.5, '1', null]) {
  assert.equal(candidate.mayRetry(attempts), Number.isInteger(attempts) && attempts >= 0 && attempts < maximumAttempts);
}
console.log('Verified exact change and nine retry boundary cases.');
