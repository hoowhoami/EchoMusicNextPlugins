import { resolveFoliaReference } from './folia-reference.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reference = await resolveFoliaReference(process.argv[2]);
const output = path.resolve(process.argv[3] || path.join(root, 'build/folia-fume-reference'));
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const sourcePath = 'src/components/visualizer/fume/FumeBackground.ts';
const source = await readFile(path.join(reference, sourcePath));
const harness = `import {buildFumeBackgroundScene,drawFumeBackground} from './${sourcePath}';
const canvas=document.querySelector('canvas'),dpr=window.devicePixelRatio;
canvas.width=800*dpr;canvas.height=400*dpr;canvas.style.width='800px';canvas.style.height='400px';
const ctx=canvas.getContext('2d'),scene=buildFumeBackgroundScene({viewport:{width:800,height:400},world:{width:800,height:400},seed:'vector-proof'});
function render(time){ctx.reset();ctx.scale(dpr,dpr);ctx.fillStyle='#101820';ctx.fillRect(0,0,800,400);ctx.save();ctx.translate(-80,-40);drawFumeBackground({context:ctx,scene,theme:{accentColor:'#ff8855',secondaryColor:'#77aaff'},time,audioLevels:{bass:127,lowMid:127,mid:127,vocal:127,treble:127},objectOpacityMultiplier:2});ctx.restore();ctx.globalAlpha=.6;ctx.fillStyle='rgba(255,80,40,.8)';ctx.shadowColor='rgba(80,160,255,.4)';ctx.shadowBlur=20;ctx.fillRect(400,200,42,8);}
window.reference={setTime(time){render(time)},setMode(){},describe(){return {dpr,width:canvas.width,height:canvas.height}}};window.referenceReady=true;render(0);`;
const result = await build({
  stdin: { contents: harness, resolveDir: reference },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  define: { 'import.meta.env.DEV': 'false' },
});
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'reference.js'), result.outputFiles[0].text);
await writeFile(
  path.join(output, 'index.html'),
  '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden}canvas{display:block}</style><canvas></canvas><script type="module" src="reference.js"></script>',
);
await writeFile(
  path.join(output, 'reference.json'),
  JSON.stringify(
    {
      revision,
      sourcePath,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      prefix: 'fume',
      logicalWidth: 800,
      logicalHeight: 400,
      times: [0, 1, 3],
      modes: ['decor'],
    },
    null,
    2,
  ) + '\n',
);
console.info(output);
