// Chrome CSS oracle for the source Harmony mask and radial Gaussian background.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const reference = path.resolve(process.argv[2] || '../folia-major'),
  output = path.resolve(process.argv[3] || 'build/folia-harmony-reference');
const relative = 'src/components/visualizer/VisualizerHarmonyOverlay.tsx',
  source = await readFile(path.join(reference, relative), 'utf8');
if (!source.includes('rgba(0,0,0,0.86)') || !source.includes('blur-2xl'))
  throw Error('Pinned Harmony shader seams changed');
const module = process.env.FOLIA_PLAYWRIGHT_MODULE;
if (!module) throw Error('FOLIA_PLAYWRIGHT_MODULE is required');
const { chromium } = await import(pathToFileURL(path.resolve(module)));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  await mkdir(path.join(output, 'native'), { recursive: true });
  for (const dpr of [1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 464, height: 312 },
      deviceScaleFactor: dpr,
    });
    await page.setContent(
      '<style>body{margin:0;background:#000}#glow{position:absolute;left:72px;top:72px;width:320px;height:168px;background:radial-gradient(ellipse at center,rgba(232,58,152,.7) 0%,rgba(232,58,152,.42) 48%,transparent 78%);filter:blur(24px)}</style><div id="glow"></div>',
    );
    await page.screenshot({ path: path.join(output, `glow-dpr${dpr}.png`) });
    await page.setViewportSize({ width: 160, height: 80 });
    await page.setContent(
      '<style>body{margin:0;background:#000}#ink{position:absolute;inset:0;background:white;mask-image:linear-gradient(90deg,#000 0px,#000 3px,rgba(0,0,0,.86) 16.5px,transparent 30px,transparent 100%)}</style><div id="ink"></div>',
    );
    await page.screenshot({ path: path.join(output, `mask-dpr${dpr}.png`) });
    await page.close();
  }
  await writeFile(
    path.join(output, 'capture.json'),
    JSON.stringify(
      {
        browser: await browser.version(),
        source: relative,
        sha256: createHash('sha256').update(source).digest('hex'),
        mask: { edge: 30, solid: 3, half: 16.5 },
        sigma: 24,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await browser.close();
}
