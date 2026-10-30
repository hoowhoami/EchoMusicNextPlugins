import test from 'node:test';
import assert from 'node:assert/strict';
import { theme } from '../plugins/folia-lyrics-skin/qml/styles/lumiere/stage.mjs';

test('real Lumiere theme adapter preserves public theme icon names instead of clearing them', () => {
  const names = ['Heart', 'UnknownIcon', 'StarIcon'];
  const result = theme({}, 'Arial', '#ffffff', '#999999', '#abcdef', '#111111', names);
  assert.deepEqual(result.lyricsIcons, names);
  assert.deepEqual(names, ['Heart', 'UnknownIcon', 'StarIcon']);
});

import {
  exactIconName,
  iconPath,
  resolveNames,
} from '../plugins/folia-lyrics-skin/qml/styles/sonnet/icons.mjs';
import { resolveLucideIconNames } from '../plugins/folia-lyrics-skin/qml/styles/lumiere/icon-resolver.mjs';
import { buildParticles } from '../plugins/folia-lyrics-skin/qml/styles/monet/decor.mjs';
import {
  particleFrame,
  introOpacity,
} from '../plugins/folia-lyrics-skin/qml/styles/monet/decor-frame.mjs';
import { foliaPath } from './folia-source.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import {
  definitions,
  aliases,
} from '../plugins/folia-lyrics-skin/qml/styles/sonnet/icons-data.mjs';
import { buildShotIconArts } from '../plugins/folia-lyrics-skin/qml/styles/lumiere/source/lineart/themeIcons.mjs';

let resolvers;
async function sourceResolvers() {
  if (resolvers) return resolvers;
  const loaders = await readFile(
    foliaPath('node_modules/lucide-react/dist/esm/dynamicIconImports.mjs'),
    'utf8',
  );
  const imports = [...loaders.matchAll(/"([^"]+)": \(\) => import\('\.\/icons\/([^']+)'\)/g)].map(
    (match) => [match[1], path.basename(match[2], '.mjs')],
  );
  assert.deepEqual(
    [...new Set(imports.map(([, file]) => file))],
    Object.keys(definitions),
    'the test loader uses the real pinned import table including file aliases',
  );
  const output = await build({
    stdin: {
      resolveDir: foliaPath(),
      contents:
        "export * from './src/services/lucideIconResolver.ts';export {loadSonnetIconNames} from './src/components/visualizer/sonnet/sonnetIcons.ts';export {buildShotIconArts} from './src/components/visualizer/lumiere/lineart/themeIcons.ts';",
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    plugins: [
      {
        name: 'loaded-pinned-lucide-environment',
        setup(builder) {
          builder.onResolve(
            { filter: /^(react|react-dom\/server|lucide-react\/dynamicIconImports)$/ },
            (args) => ({ path: args.path, namespace: 'loaded-lucide' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'loaded-lucide' }, (args) => ({
            loader: 'js',
            contents:
              args.path === 'react'
                ? 'export default {};'
                : args.path === 'react-dom/server'
                  ? 'export const renderToStaticMarkup=()=>{throw Error("SVG markup is outside this resolver oracle");};'
                  : 'const nodes=' +
                    JSON.stringify(
                      Object.fromEntries(
                        imports.map(([key, file]) => [key, definitions[file].node]),
                      ),
                    ) +
                    ';export default Object.fromEntries(Object.keys(nodes).map(key=>[key,async()=>({default:{$$typeof:Symbol.for("react.forward_ref"),render:()=>({props:{icon:{node:nodes[key]}}})}})]));',
          }));
        },
      },
    ],
  });
  return (resolvers = await import(
    'data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64')
  ));
}

test('full pinned name table retains original resolver and Sonnet fallback decisions', async () => {
  const original = await sourceResolvers();
  await original.loadLucideIcons(Object.keys(aliases));
  for (const name of [
    ...Object.keys(aliases),
    'UnknownIcon',
    '__proto__',
    'constructor',
    'toString',
  ]) {
    assert.equal(exactIconName(name), original.resolveLucideIcon(name) ? name : null, name);
    const list = [name.toLowerCase(), name, name];
    assert.deepEqual(resolveLucideIconNames(list), original.resolveLucideIconNames(list), name);
    assert.deepEqual(resolveNames(list), await original.loadSonnetIconNames(list), name);
  }
  assert.deepEqual(await original.loadSonnetIconNames([]), resolveNames([]));
});

test('Lumiere actual source theme line art stays empty for unknown icons and matches all generated paths', async () => {
  const original = await sourceResolvers();
  for (const icons of [
    [],
    ['UnknownIcon'],
    ['Heart'],
    ['star', 'Star', 'HeartIcon'],
    ['Flower', 'LucideHeart', 'UnknownIcon'],
  ]) {
    await original.loadLucideIcons(icons);
    const options = {
      icons,
      enabled: true,
      aspect: 16 / 9,
      avoid: { cx: 0.8, cy: 0.5, w: 0.5, h: 0.4 },
      seed: 'public-theme',
      shotKinds: ['orbit', 'focus', 'afterglow'],
    };
    assert.deepEqual(buildShotIconArts(options), original.buildShotIconArts(options));
  }
});

test('each original icon resolver retains its own fallback and exact/list lookup semantics', () => {
  assert.deepEqual(resolveNames([]), ['Flower']);
  assert.deepEqual(resolveNames(['UnknownIcon']), ['Flower']);
  assert.deepEqual(resolveNames(['star', 'Star', 'HeartIcon']), ['Star', 'HeartIcon']);
  assert.deepEqual(resolveLucideIconNames([]), []);
  assert.deepEqual(resolveLucideIconNames(['UnknownIcon']), []);
  assert.deepEqual(resolveLucideIconNames(['star', 'Star', 'HeartIcon']), ['Star', 'HeartIcon']);
  assert.equal(
    exactIconName(' heart '),
    null,
    'Monet/Pendolo exact calls do not use list canonicalization',
  );
  assert.equal(exactIconName(' Heart '), 'Heart');
  assert.equal(iconPath('Heart'), iconPath('HeartIcon'));
  assert.match(
    iconPath('Square'),
    /A2 2 0 0 1/,
    'direct SVG rounded rect keeps elliptical corners',
  );
  assert.equal(iconPath('UnknownIcon'), '');
  for (const name of ['__proto__', 'constructor', 'toString']) {
    assert.equal(exactIconName(name), null, 'Object prototype names are not Lucide exports');
    assert.deepEqual(resolveNames([name]), ['Flower']);
    assert.deepEqual(resolveLucideIconNames([name]), []);
  }
});
let source;
async function sourceDecor() {
  if (source) return source;
  const code = await readFile(
    foliaPath('src/components/visualizer/monet/MonetFloatingDecor.tsx'),
    'utf8',
  );
  const result = await build({
    stdin: {
      contents: code + '\nexport { buildParticles };',
      resolveDir: path.dirname(foliaPath('src/components/visualizer/monet/MonetFloatingDecor.tsx')),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    jsx: 'transform',
    plugins: [
      {
        name: 'capture-original-icon-elements',
        setup(builder) {
          builder.onResolve(
            { filter: /^(react|framer-motion)$|useLucideIcons|lucideIconResolver/ },
            (args) => ({ path: args.path, namespace: 'icons-oracle' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'icons-oracle' }, (args) => ({
            loader: 'js',
            contents:
              args.path === 'react'
                ? 'export const useMemo=f=>f();export default {createElement:(type,props,...children)=>({type,props:props||{},children:children.flat()})};'
                : args.path === 'framer-motion'
                  ? "export const motion={div:'motion.div'};"
                  : args.path.includes('useLucideIcons')
                    ? 'export const useLucideIcons=()=>{};'
                    : "const known=new Set(['Heart','Star','Flower','StarIcon','LucideHeart']);export const getLucideIconStatus=n=>known.has(n)?'ready':'missing';export const resolveLucideIcon=n=>known.has(n)?n:null;",
          }));
        },
      },
    ],
  });
  return (source = await import(
    'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
  ));
}
test('Monet uses original sparse ten slots, preserves duplicates and unknown empty slots', async () => {
  const original = await sourceDecor();
  for (const names of [
    [],
    ['Heart'],
    ['Heart', 'UnknownIcon', 'Heart'],
    ['StarIcon', 'LucideHeart'],
  ]) {
    assert.deepEqual(buildParticles(names), original.buildParticles(names));
    const rendered = original.default({
      theme: { lyricsIcons: names, secondaryColor: '#999999' },
      staticMode: false,
    });
    if (!names.length) {
      assert.equal(rendered, null);
      continue;
    }
    const particles = buildParticles(names);
    assert.deepEqual(
      particles.map((p) => p.id),
      [1, 2, 3, 4, 5, 6, 7, 9],
    );
    for (let i = 0; i < particles.length; ++i) {
      const p = particles[i],
        node = rendered.children[i];
      assert.equal(node.type, 'motion.div');
      assert.equal(node.props.style.left, p.x + '%');
      assert.equal(node.props.style.top, p.y + '%');
      assert.equal(node.props.transition.duration, p.duration);
      assert.equal(node.props.transition.delay, p.delay);
      assert.equal(node.props.transition.ease, 'easeInOut');
      assert.equal(node.props.transition.repeat, Infinity);
      assert.equal(node.children[0] === null, p.iconName === 'UnknownIcon');
      for (let k = 0; k < 4; ++k) {
        const frame = particleFrame(p, p.delay + (p.duration * k) / 4, false);
        for (const [key, field] of [
          ['x', 'x'],
          ['y', 'y'],
          ['rotate', 'rotation'],
          ['opacity', 'opacity'],
        ])
          assert.ok(
            Math.abs(frame[field] - node.props.animate[key][k]) < 1e-9,
            key + ' original keyframe',
          );
      }
      const last = particleFrame(p, p.delay + p.duration, false);
      assert.equal(
        last.opacity,
        node.props.animate.opacity[4],
        'exact repeat boundary retains the final source key',
      );
      assert.equal(last.x, node.props.animate.x[4]);
      const staticNode = original.default({
        theme: { lyricsIcons: names, secondaryColor: '#999999' },
        staticMode: true,
      }).children[i];
      assert.deepEqual(particleFrame(p, 100, true), {
        x: 0,
        y: 0,
        rotation: p.rotation,
        opacity: p.opacity,
      });
      assert.equal(staticNode.props.style.transform, `rotate(${p.rotation}deg)`);
    }
  }
  assert.equal(introOpacity(0, false), 0);
  assert.equal(introOpacity(2.2, false), 1);
  assert.equal(introOpacity(0, true), 1);
});
