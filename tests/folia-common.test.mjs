import { foliaURL } from './folia-source.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import {
  makeShapes,
  makeParticles,
  getShapeScaleKey,
} from '../plugins/folia-lyrics-skin/qml/backgrounds/common/scene.mjs';
import {
  drift,
  rise,
  bandScale,
} from '../plugins/folia-lyrics-skin/qml/backgrounds/common/motion.mjs';

test('Common scene equals the actual upstream React component for identical random tapes', async () => {
  const source = await readFile(
    foliaURL('src/components/visualizer/backgrounds/common/GeometricBackground.tsx'),
    'utf8',
  );
  const result = await build({
    stdin: { contents: source + '\nexport { GeometricLayer };', loader: 'tsx', resolveDir: '/' },
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2016',
    plugins: [
      {
        name: 'source-only-react',
        setup(b) {
          b.onResolve({ filter: /.*/ }, (args) => ({ path: args.path, namespace: 'stub' }));
          b.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
            contents:
              args.path === 'react'
                ? 'export const useMemo=f=>f(); export default {memo:f=>f,createElement:(type,props,...children)=>({type,props,children})};'
                : args.path === 'framer-motion'
                  ? 'export const AnimatePresence="presence",motion={div:"motion.div"}; export const useSpring=x=>x,useTransform=x=>x;'
                  : 'export const useLucideIcons=()=>{},getLucideIconStatus=()=>"ready",resolveLucideIcon=()=>null;',
          }));
        },
      },
    ],
  });
  const oracle = await import(
    'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
  );
  for (let seed = 0; seed < 12; ++seed) {
    const tape = () => {
      let value = seed + 1;
      return () => {
        value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
        return value / 4294967296;
      };
    };
    const originalRandom = Math.random;
    let original;
    try {
      Math.random = tape();
      original = oracle.GeometricLayer({ theme: {}, audioPower: 0, seed });
    } finally {
      Math.random = originalRandom;
    }
    const props = original.children[0].props,
      random = tape();
    assert.deepEqual(makeShapes(random), props.shapes);
    assert.deepEqual(makeParticles(random), props.particles);
    assert.equal(props.shapes.length, 15);
    assert.equal(props.particles.length, 20);
    assert.ok(props.shapes.filter((x) => x.iconSlot !== null).length <= 6);
  }
});

test('source CSS drift/rise retain delay, linear halves, rotation and wrapped loops', () => {
  const shape = { delay: 2, duration: 40, reverse: false, initialRotation: 13 };
  assert.deepEqual(drift(shape, 0), { x: -15, y: 30, rotation: 13 });
  assert.deepEqual(drift(shape, 12), { x: 0, y: 0, rotation: 103 });
  assert.deepEqual(drift(shape, 22), { x: 15, y: -30, rotation: 193 });
  assert.deepEqual(drift(shape, 42), { x: -15, y: 30, rotation: 13 });
  assert.deepEqual(drift({ ...shape, reverse: true }, 22), { x: -15, y: 30, rotation: 193 });
  const particle = { delay: 3, duration: 20, opacity: 0.24 };
  assert.deepEqual(rise(particle, 1), { y: -0, opacity: 0 });
  assert.deepEqual(rise(particle, 13), { y: -50, opacity: 0.24 });
  assert.deepEqual(rise(particle, 23), { y: -0, opacity: 0 });
  assert.equal(bandScale(0), 0.95);
  assert.equal(bandScale(105), 1.2);
  assert.equal(bandScale(255), 1.45);
  assert.deepEqual(
    ['circle', 'square', 'triangle', 'cross'].map((type) => getShapeScaleKey({ type })),
    ['bass', 'lowMid', 'mid', 'treble'],
  );
});
