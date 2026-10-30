// Capture the pinned source's actual CSS expressions in Chrome, without a ported blur oracle.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const reference = path.resolve(process.argv[2] || '../folia-major');
const output = path.resolve(process.argv[3] || 'build/folia-monet-frame-reference');
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
if (
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: reference, encoding: 'utf8' }).trim() !==
  revision
)
  throw new Error('Pinned Folia revision mismatch');
const sourcePath = 'src/components/visualizer/monet/VisualizerMonet.tsx';
const source = await readFile(path.join(reference, sourcePath), 'utf8');
const square = source.match(/boxShadow: `(0 36px 80px [^`]+)`/)[1];
const rect = source.match(/boxShadow: `(0 24px 60px [^`]+)`/)[1];
const module = process.env.FOLIA_PLAYWRIGHT_MODULE;
if (!module) throw new Error('Set FOLIA_PLAYWRIGHT_MODULE to playwright/index.mjs');
const { chromium } = await import(pathToFileURL(path.resolve(module)));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  await mkdir(path.join(output, 'native'), { recursive: true });
  const captures = [];
  for (const dpr of [1, 2]) {
    const page = await browser.newPage({
      viewport: { width: 800, height: 800 },
      deviceScaleFactor: dpr,
    });
    for (const squareStyle of [true, false])
      for (const dark of [false, true]) {
        const name = (squareStyle ? 'square' : 'rect') + '-' + (dark ? 'dark' : 'white');
        const result = await page.evaluate(
          ({ expression, squareStyle, dark }) => {
            const theme = {
              primaryColor: '#ff9966',
              accentColor: '#6699ff',
              backgroundColor: '#361528',
            };
            function colorWithAlpha(color, alpha) {
              const n = parseInt(color.slice(1), 16);
              return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
            }
            const shadow = Function(
              'theme',
              'colorWithAlpha',
              'return `' + expression + '`;',
            )(theme, colorWithAlpha);
            document.body.style.cssText = 'margin:0;background:' + (dark ? '#14283c' : 'white');
            const box = document.createElement('div');
            box.style.cssText =
              'position:absolute;box-sizing:border-box;' +
              (squareStyle
                ? 'left:240px;top:180px;width:320px;height:320px;border-radius:32px'
                : 'left:252px;top:160px;width:296px;height:400px;border-radius:34.4px;border:1px solid ' +
                  colorWithAlpha(theme.primaryColor, 0.1));
            box.style.boxShadow = shadow;
            box.style.backgroundColor = colorWithAlpha(
              squareStyle ? theme.primaryColor : theme.backgroundColor,
              squareStyle ? 0.08 : 0.15,
            );
            document.body.replaceChildren(box);
            return { shadow, computed: getComputedStyle(box).boxShadow };
          },
          { expression: squareStyle ? square : rect, squareStyle, dark },
        );
        await page.screenshot({ path: path.join(output, `${name}-dpr${dpr}.png`) });
        captures.push({ name, dpr, ...result });
      }
    await page.close();
  }
  await writeFile(
    path.join(output, 'capture.json'),
    JSON.stringify(
      {
        revision,
        sourcePath,
        sourceSha256: createHash('sha256').update(source).digest('hex'),
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
