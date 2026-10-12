import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../packages/scanner/dist/stackfold.cjs', import.meta.url));

function run(args, expectedStatus) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root, encoding: 'utf8', timeout: 30_000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, expectedStatus, `${args.join(' ')}\n${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

for (const command of [[], ['cache-isolation'], ['signature-compatibility'], ['queue-compatibility']]) {
  assert.match(run([...command, '--help'], 0), /Usage: stackfold/);
}
assert.match(run([], 1), /Usage: stackfold/);

const passing = JSON.parse(run(['queue-compatibility', 'fixtures/queue-compatibility-passing'], 0));
assert.ok(passing.payloads.length > 0);
assert.ok(passing.payloads.every(payload => payload.verdict !== 'fail'));
const failing = JSON.parse(run(['queue-compatibility', 'fixtures/queue-compatibility-failing'], 1));
assert.ok(failing.payloads.some(payload => payload.verdict === 'fail'));
console.log('CLI distribution smoke passed: help, missing arguments, passing and failing queue checks.');
