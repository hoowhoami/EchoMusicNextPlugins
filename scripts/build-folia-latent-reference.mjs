import { resolveFoliaReference } from './folia-reference.mjs';
// Browser-only acceptance oracle. Never included in the native plugin package.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reference = await resolveFoliaReference(process.argv[2]);
const output = path.resolve(process.argv[3] || path.join(root, 'build/folia-latent-reference'));
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const paper = path.join(reference, 'node_modules/@paper-design/shaders');
if (JSON.parse(await readFile(path.join(paper, 'package.json'), 'utf8')).version !== '0.0.80')
  throw new Error('Expected pinned Paper 0.0.80');
await mkdir(output, { recursive: true });
await writeFile(
  path.join(output, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Folia a8da4437 Paper 0.0.80 reference</title>
<style>*{box-sizing:border-box}html,body{padding:0;margin:0;background:#181e2b}#reference{position:relative;width:800px;height:400px;overflow:hidden;background:#181e2b}.paper{position:absolute;inset:0;transform-origin:center}</style>
<div id="reference"><div id="mesh" class="paper" style="transform:scale(1.025)"></div><div id="dither" class="paper" style="transform:scale(1.015);opacity:.55;mix-blend-mode:soft-light"></div></div>
<script type="module" src="reference.js"></script>`,
);
const modulePath = (file) => JSON.stringify(path.join(paper, 'dist', file));
await build({
  stdin: {
    contents: `import {ShaderMount} from ${modulePath('shader-mount.js')};
import {meshGradientFragmentShader} from ${modulePath('shaders/mesh-gradient.js')};
import {ditheringFragmentShader} from ${modulePath('shaders/dithering.js')};
const rgba=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255,1];
const sizing={u_originX:.5,u_originY:.5,u_worldWidth:0,u_worldHeight:0,u_fit:1,u_scale:1,u_rotation:0,u_offsetX:0,u_offsetY:0};
const mesh=new ShaderMount(document.getElementById('mesh'),meshGradientFragmentShader,{...sizing,u_colors:['#d84f60','#2244bb','#608b37','#edb344','#181e2b','#cc5974'].map(rgba),u_colorsCount:6,u_distortion:.8,u_swirl:.1,u_grainMixer:0,u_grainOverlay:.01},{alpha:true,preserveDrawingBuffer:true},0,0,1,1280*720);
const dither=new ShaderMount(document.getElementById('dither'),ditheringFragmentShader,{...sizing,u_fit:0,u_scale:.6,u_colorBack:rgba('#181e2b'),u_colorFront:rgba('#d84f60'),u_shape:2,u_type:3,u_pxSize:2.5},{alpha:true,preserveDrawingBuffer:true},0,0,1,1280*720);
window.reference={describe(){return [mesh,dither].map(shader=>({width:shader.canvasElement.width,height:shader.canvasElement.height,renderScale:shader.renderScale,parentWidth:shader.parentWidth,parentHeight:shader.parentHeight}));},setMode(mode){document.getElementById('mesh').style.display=mode==='dithering'?'none':'';document.getElementById('dither').style.display=mode==='mesh'?'none':'';document.getElementById('dither').style.opacity=mode==='dithering'?'1':'.55';document.getElementById('dither').style.mixBlendMode=mode==='dithering'?'normal':'soft-light';},setTime(seconds){mesh.setFrame(seconds*.3*1000);dither.setFrame(seconds*.1*1000);document.getElementById('mesh').style.filter=seconds===0?'none':'saturate(1.04) brightness(.94)';}};
window.referenceReady=true;`,
    resolveDir: output,
    sourcefile: 'reference-source.js',
    loader: 'js',
  },
  bundle: true,
  outfile: path.join(output, 'reference.js'),
  format: 'esm',
  platform: 'browser',
});
await writeFile(
  path.join(output, 'reference.json'),
  JSON.stringify(
    {
      foliaRevision: revision,
      paperVersion: '0.0.80',
      logicalWidth: 800,
      logicalHeight: 400,
      times: [0, 1, 3],
      modes: ['both', 'mesh', 'dithering'],
      fixture:
        'Authored cover palette, zero PCM, initial and settled CSS filters; no music or font assets.',
    },
    null,
    2,
  ) + '\n',
);
console.info(output);
