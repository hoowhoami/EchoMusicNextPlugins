import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = ['PreparedLyrics.qml', 'LyricTimeline.qml', 'harmony/HarmonyIndex.qml'];
for (const file of files) {
  const source = await readFile(
    new URL('../plugins/folia-lyrics-skin/qml/shared/' + file, import.meta.url),
    'utf8',
  );
  for (const signal of ['onModelReset', 'onDataChanged']) {
    const start = source.indexOf('function ' + signal + '(');
    assert.ok(start >= 0, file + ' still observes the real read model');
    const open = source.indexOf('{', start);
    let depth = 1,
      end = open + 1;
    while (depth && end < source.length) {
      if (source[end] === '{') ++depth;
      else if (source[end] === '}') --depth;
      ++end;
    }
    assert.equal(depth, 0);
    const callback = new Function('root', source.slice(open + 1, end - 1));
    test(
      file +
        ' ' +
        signal +
        ' retires with its bound owner while live notifications still invalidate',
      () => {
        let calls = 0;
        callback({
          invalidate() {
            ++calls;
          },
        });
        assert.equal(calls, 1);
        assert.doesNotThrow(
          () => callback(null),
          'native model retirement can emit after the bound root is cleared',
        );
      },
    );
  }
}
