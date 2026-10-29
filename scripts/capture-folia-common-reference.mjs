// Runs the pinned desktop FluidBackground functions in real Chrome Canvas.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';

const reference = path.resolve(process.argv[2] || '../folia-major');
const output = path.resolve(process.argv[3] || 'build/folia-common-reference');
const file = 'src/components/visualizer/backgrounds/common/FluidBackground.tsx';
const source = await readFile(path.join(reference, file), 'utf8');
const start = source.indexOf('const COVER_CANVAS_WIDTH =');
const end = source.indexOf('interface CoverCanvasProps');
if (start < 0 || end < start) throw new Error('Source desktop Canvas boundaries changed');
const code = (await transform(source.slice(start, end), { loader: 'ts', target: 'es2016' })).code;
const fixture = await readFile('tests/fixtures/common/authored-cover.png');
const script =
  code +
  `
window.draw=async function({width,height,primary,secondary}){
 const image=new Image();image.src='/cover.png';await image.decode();
 const bitmap=await createImageBitmap(image);
 const canvas=document.querySelector('canvas');canvas.style.width=width+'px';canvas.style.height=height+'px';
 canvas.width=320;canvas.height=Math.max(1,Math.round(320*height/width));
 drawCover(canvas,bakeBlurredCover(bitmap,canvas.width,canvas.height,width),primary,secondary);bitmap.close();
 return{buffer:[canvas.width,canvas.height],sigma:60*320/width,canvasFilter:canvasBlurWorks()};
};window.ready=true;`;
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/cover.png') {
    response.setHeader('Content-Type', 'image/png');
    response.end(fixture);
  } else if (url.pathname === '/reference.js') {
    response.setHeader('Content-Type', 'text/javascript');
    response.end(script);
  } else if (url.pathname === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end(
      '<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}canvas{display:block}</style><canvas></canvas><script type="module" src="/reference.js"></script>',
    );
  } else response.writeHead(404).end();
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const module = process.env.FOLIA_PLAYWRIGHT_MODULE;
if (!module) throw new Error('Set FOLIA_PLAYWRIGHT_MODULE to an installed playwright/index.mjs');
const { chromium } = await import(pathToFileURL(path.resolve(module)));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  await mkdir(path.join(output, 'native'), { recursive: true });
  const captures = [];
  for (const dpr of [1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 800, height: 640 },
      deviceScaleFactor: dpr,
    });
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.waitForFunction(() => window.ready);
    for (const [name, width, height, primary, secondary] of [
      ['landscape-clear', 800, 400, 'transparent', 'transparent'],
      ['landscape-overlay', 800, 400, '#ff9966', '#6699ff'],
      ['portrait-clear', 320, 640, 'transparent', 'transparent'],
      ['portrait-overlay', 320, 640, '#ff9966', '#6699ff'],
    ]) {
      const result = await page.evaluate((options) => window.draw(options), {
        width,
        height,
        primary,
        secondary,
      });
      await page.locator('canvas').screenshot({ path: path.join(output, `${name}-dpr${dpr}.png`) });
      captures.push({ name, width, height, dpr, primary, secondary, ...result });
    }
    if (failures.length) throw new Error(failures.join('\n'));
    await page.close();
  }
  await writeFile(
    path.join(output, 'capture.json'),
    JSON.stringify(
      {
        source: file,
        sourceSha256: createHash('sha256').update(source).digest('hex'),
        browser: await browser.version(),
        captures,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
