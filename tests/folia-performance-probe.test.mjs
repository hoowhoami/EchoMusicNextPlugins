import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test(
  'native performance evidence protocol rejects invalid reports and preserves partial runs (CPU only)',
  {
    skip:
      process.platform === 'win32'
        ? 'Native performance probe process groups require POSIX'
        : false,
  },
  () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const output = execFileSync('python3', ['tests/performance/test_probe_protocol.py', '-v'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000,
    });
    assert.equal(typeof output, 'string');
  },
);
