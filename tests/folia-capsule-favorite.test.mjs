import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Execute the actual QML action/glyph functions, including their real derived
// binding. This guards the ordinary current-source favorite and its UI wiring.
const source = readFileSync(
  new URL('../plugins/folia-lyrics-skin/qml/shared/PlayerCapsule.qml', import.meta.url),
  'utf8',
);
function body(name) {
  const start = source.indexOf(`    function ${name}(`);
  assert.notEqual(start, -1, `Missing production function ${name}`);
  const open = source.indexOf('{', start);
  let depth = 1;
  let end = open + 1;
  while (depth && end < source.length) {
    if (source[end] === '{') depth++;
    else if (source[end] === '}') depth--;
    end++;
  }
  assert.equal(depth, 0);
  return source.slice(open + 1, end - 1);
}
const enabled = new Function('scope', 'action', `with (scope) { ${body('actionEnabled')} }`);
const glyph = new Function('scope', 'action', `with (scope) { ${body('slotGlyph')} }`);
function capsule(favorite) {
  const scope = {
    controlsEnabled: true,
    actionSupported: () => true,
    playbackSnapshot: { favorite, favoriteBusy: false },
    playMode: 0,
  };
  return { enabled: () => enabled(scope, 'like'), glyph: () => glyph(scope, 'like'), scope };
}
test('ordinary favorite keeps the actual current-source state and busy guard', () => {
  for (const favorite of [false, true]) {
    const value = capsule(favorite);
    assert.equal(value.enabled(), true);
    assert.equal(value.glyph(), favorite ? 'heart-filled' : 'heart');
    value.scope.playbackSnapshot.favoriteBusy = true;
    assert.equal(value.enabled(), false);
  }
});
