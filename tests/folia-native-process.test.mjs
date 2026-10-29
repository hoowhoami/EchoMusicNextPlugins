import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test(
  'native runners retire only their owned process groups and preserve partial evidence (CPU only)',
  {
    skip:
      process.platform === 'win32' ? 'Native probe process-group cleanup requires POSIX' : false,
  },
  () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const output = execFileSync('python3', ['tests/runtime/test_owned_process.py', '-v'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 45000,
    });
    assert.equal(typeof output, 'string');
  },
);
