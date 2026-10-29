// Requires an existing Playwright installation only for the browser oracle.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const source = path.resolve(process.argv[2] || 'build/folia-latent-reference');
const output = path.resolve(process.argv[3] || path.join(source, 'browser'));
const spec = JSON.parse(await readFile(path.join(source, 'reference.json'), 'utf8'));
const playwright = process.env.FOLIA_PLAYWRIGHT_MODULE;
if (!playwright)
  throw new Error('Set FOLIA_PLAYWRIGHT_MODULE to an installed playwright/index.mjs');
const { chromium } = await import(pathToFileURL(path.resolve(playwright)));
const server = http.createServer(async (request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname;
  if (!['/', '/index.html', '/reference.js'].includes(name)) {
    response.writeHead(404).end();
    return;
  }
  try {
    response.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : 'text/html');
    response.end(await readFile(path.join(source, name === '/' ? 'index.html' : name.slice(1))));
  } catch {
    response.writeHead(500).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  for (const dpr of [1, 2]) {
    browser = await chromium.launch({
      headless: true,
      args: ['--force-device-scale-factor=' + dpr],
    });
    const destination = path.join(output, 'dpr' + dpr);
    await mkdir(destination, { recursive: true });
    const page = await browser.newPage({
      viewport: { width: spec.logicalWidth, height: spec.logicalHeight },
      deviceScaleFactor: dpr,
    });
    const failures = [];
    const captures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.referenceReady);
    for (const time of spec.times) {
      await page.evaluate((value) => window.reference.setTime(value), time);
      for (const mode of spec.modes) {
        await page.evaluate((value) => window.reference.setMode(value), mode);
        await page.waitForTimeout(80);
        captures.push({
          time,
          mode,
          surfaces: await page.evaluate(() => window.reference.describe()),
        });
        await page.screenshot({
          path: path.join(destination, `${spec.prefix || 'latent'}-${mode}-t${time}.png`),
        });
      }
    }
    if (failures.length) throw new Error(failures.join('\n'));
    await writeFile(
      path.join(destination, 'capture.json'),
      JSON.stringify(
        {
          browser: await browser.version(),
          dpr,
          viewport: [spec.logicalWidth, spec.logicalHeight],
          captures,
          reference: spec,
        },
        null,
        2,
      ) + '\n',
    );
    await page.close();
    await browser.close();
    browser = null;
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
console.info(output);
