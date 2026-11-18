import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NearestFilter,
  LinearFilter,
  NearestMipmapLinearFilter,
  LinearMipmapNearestFilter,
  RepeatWrapping,
  MirroredRepeatWrapping,
} from 'three';
import { nativeSampler } from '../plugins/folia-lyrics-skin/qml/styles/machi/sampling.mjs';

test('Machi preserves discrete toon, depth and SMAA lookup sampling', () => {
  const lookup = nativeSampler({ minFilter: NearestFilter, magFilter: NearestFilter });
  assert.deepEqual(lookup, {
    minFilter: 'nearest',
    magFilter: 'nearest',
    mipFilter: 'none',
    u: 'clamp',
    v: 'clamp',
  });
  assert.equal(
    nativeSampler({ minFilter: LinearFilter, magFilter: LinearFilter }).minFilter,
    'linear',
  );
});

test('Machi retains independent mip interpolation and texture wrapping', () => {
  assert.deepEqual(
    nativeSampler({
      minFilter: NearestMipmapLinearFilter,
      mipmaps: true,
      wrapS: RepeatWrapping,
      wrapT: MirroredRepeatWrapping,
    }),
    { minFilter: 'nearest', magFilter: 'linear', mipFilter: 'linear', u: 'repeat', v: 'mirror' },
  );
  assert.equal(
    nativeSampler({ minFilter: LinearMipmapNearestFilter, mipmaps: true }).mipFilter,
    'nearest',
  );
  assert.equal(
    nativeSampler({ minFilter: LinearMipmapNearestFilter, mipmaps: false }).mipFilter,
    'none',
  );
});
