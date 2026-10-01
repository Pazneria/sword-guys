import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://127.0.0.1:4185/wiki/';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Only use a local isolated preview');
const output = resolve(process.argv[3] ?? 'playtest-shots/wiki');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { url, checks: [], consoleErrors: [], failedResources: [], unexpectedRequests: [] };
try {
  for (const width of [1280, 760, 393, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 960 : 1100 }, reducedMotion: 'reduce', isMobile: width < 760, hasTouch: width < 760 });
    try {
      const page = await context.newPage();
      page.on('request', (request) => { if (new URL(request.url()).origin !== new URL(url).origin) report.unexpectedRequests.push(request.url()); });
      page.on('pageerror', (error) => report.consoleErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
      page.on('response', (response) => { if (response.status() >= 400) report.failedResources.push({ url: response.url(), status: response.status() }); });
      await page.goto(url, { waitUntil: 'networkidle' });
      assert.equal(await page.title(), 'Sword Guys — Player Guide');
      assert.equal(await page.locator('script').count(), 0);
      assert.equal(await page.locator('img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)), true);
      const gameLink = await page.locator('.game-link').getAttribute('href');
      assert.equal(new URL(gameLink, url).pathname, new URL('../', url).pathname);
      assert.equal(await page.locator('.game-link').getAttribute('rel'), 'noopener');
      assert.equal(await page.locator('iframe, form, input, object, embed').count(), 0);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('a')].every((link) => ['http:', 'https:'].includes(link.protocol))), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}px`);
      await page.evaluate(() => localStorage.setItem('wiki-check-sentinel', 'preserved'));
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => localStorage.getItem('wiki-check-sentinel')), 'preserved');
      if (width === 1280) {
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('.skip-link').evaluate((element) => element === document.activeElement), true);
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('main').evaluate((element) => element === document.activeElement), true);
        const disclosure = page.locator('details').first();
        await disclosure.locator('summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await disclosure.getAttribute('open'), '');
        await page.keyboard.press('Enter');
        assert.equal(await disclosure.getAttribute('open'), null);
        await page.locator('.contents > a[href="#saves"]').click();
        assert.equal(new URL(page.url()).hash, '#saves');
        assert.equal(await page.locator('#saves h2').isVisible(), true);
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Overflow at 200% text size');
        await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.screenshot({ path: resolve(output, 'sword-guys-wiki-desktop.png') });
      }
      if (width === 393) await page.screenshot({ path: resolve(output, 'sword-guys-wiki-mobile.png') });
      report.checks.push({ width, result: 'pass', overflow: false, storageUntouched: true });
    } finally { await context.close(); }
  }
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.failedResources, []);
  assert.deepEqual(report.unexpectedRequests, []);
  report.result = 'pass';
} finally {
  await browser.close();
  writeFileSync(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));
