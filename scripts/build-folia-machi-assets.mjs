// Build-only decode of the exact SMAA lookup images shipped by pinned Three.
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { PNG } from 'pngjs';
import { writeFile } from 'node:fs/promises';
const entries = ['_getAreaTexture', '_getSearchTexture'].map((method) => {
  const url = SMAAPass.prototype[method](),
    image = PNG.sync.read(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  return { url, width: image.width, height: image.height, data: image.data.toString('base64') };
});
await writeFile(
  new URL('../plugins/folia-lyrics-skin/qml/styles/machi/inline-images.mjs', import.meta.url),
  '// Three 0.185.1 SMAA lookup pixels; MIT; see THREE-LICENSE.txt.\nconst entries=' +
    JSON.stringify(entries) +
    ';\nexport function sourceImages(){const result={},alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";for(const entry of entries){const pixels=[];let bits=0,accumulator=0;for(let i=0;i<entry.data.length;++i){const value=alphabet.indexOf(entry.data[i]);if(value<0)break;accumulator=(accumulator<<6)|value;bits+=6;if(bits>=8){bits-=8;pixels.push((accumulator>>>bits)&255);}}result[entry.url]={width:entry.width,height:entry.height,pixels:new Uint8Array(pixels)};}return result;}\n',
);
console.log(entries.map((v) => [v.width, v.height]));
