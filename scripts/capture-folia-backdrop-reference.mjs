// Real Chrome CSS backdrop-filter, using the pinned source's Tailwind blur radii.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const reference = path.resolve(process.argv[2] || '../folia-major');
const output = path.resolve(process.argv[3] || 'build/folia-backdrop-reference');
const sourcePath = 'src/components/visualizer/monet/VisualizerMonet.tsx';
const source = await readFile(path.join(reference, sourcePath), 'utf8');
const theme = await readFile(path.join(reference, 'node_modules/tailwindcss/theme.css'), 'utf8');
if (!source.includes('backdrop-blur-sm') || !source.includes('backdrop-blur-md'))
  throw new Error('Pinned source blur classes changed');
const small = Number(theme.match(/--blur-sm:\s*(\d+)px/)[1]);
const medium = Number(theme.match(/--blur-md:\s*(\d+)px/)[1]);
const module = process.env.FOLIA_PLAYWRIGHT_MODULE;
if (!module) throw new Error('Set FOLIA_PLAYWRIGHT_MODULE to playwright/index.mjs');
const { chromium } = await import(pathToFileURL(path.resolve(module)));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  await mkdir(path.join(output, 'native'), { recursive: true });
  const captures = [];
  for (const dpr of [1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 640, height: 480 },
      deviceScaleFactor: dpr,
    });
    for (const [name, sigma, rotation, scale] of [
      ['sigma8', small, 0, 1],
      ['sigma12', medium, 0, 1],
      ['transformed', small, 1, 0.95],
    ]) {
      await page.setContent(
        `<style>body{margin:0}#background{position:absolute;inset:0;background:linear-gradient(90deg,#ff3000 0%,#ff3000 50%,#0044ff 50%,#0044ff 100%)}#foreground{position:absolute;left:260px;top:180px;width:80px;height:100px;background:#00ff00;opacity:.6}#backdrop{position:absolute;left:200px;top:140px;width:240px;height:160px;border-radius:24px;backdrop-filter:blur(${sigma}px);transform:rotate(${rotation}deg) scale(${scale})}</style><div id="background"></div><div id="foreground"></div><div id="backdrop"></div>`,
      );
      await page.screenshot({ path: path.join(output, `${name}-dpr${dpr}.png`) });
      captures.push({
        name,
        dpr,
        sigma,
        rotation,
        scale,
        computed: await page
          .locator('#backdrop')
          .evaluate((el) => getComputedStyle(el).backdropFilter),
      });
    }
    await page.close();
  }
  await writeFile(
    path.join(output, 'capture.json'),
    JSON.stringify(
      {
        sourcePath,
        sourceSha256: createHash('sha256').update(source).digest('hex'),
        tailwindSha256: createHash('sha256').update(theme).digest('hex'),
        browser: await browser.version(),
        captures,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
