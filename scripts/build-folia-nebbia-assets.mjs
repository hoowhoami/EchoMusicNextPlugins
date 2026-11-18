// Decode the pinned source PNG at build time; the plugin has no PNG/Node dependency.
import { PNG } from 'pngjs';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const source = new URL(
  '../plugins/folia-lyrics-skin/qml/styles/nebbia/assets/nebbiaRaindrop.png',
  import.meta.url,
);
const bytes = await readFile(source),
  image = PNG.sync.read(bytes);
if (
  image.width !== 256 ||
  image.height !== 256 ||
  createHash('sha256').update(bytes).digest('hex') !==
    'a6123c516de0c93c6d6d7fde3a70294e9bc67a669c8d8a4b6fc72b98feb029bd'
)
  throw Error('Pinned Nebbia sprite changed');
const encoded = image.data.toString('base64');
const code =
  '// Pinned Folia raindrop PNG; MIT; see assets/nebbiaRaindrop.LICENSE.txt.\nconst encoded=' +
  JSON.stringify(encoded) +
  ';\nexport function sourceImages(){const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";const values=[];let accumulator=0,bits=0;for(let i=0;i<encoded.length;++i){const value=alphabet.indexOf(encoded[i]);if(value<0)break;accumulator=(accumulator<<6)|value;bits+=6;if(bits>=8){bits-=8;values.push((accumulator>>>bits)&255);}}return {"nebbiaRaindrop.png":{width:256,height:256,pixels:new Uint8Array(values)}};}\n';
await writeFile(
  new URL('../plugins/folia-lyrics-skin/qml/styles/nebbia/sprite-data.mjs', import.meta.url),
  code,
);
