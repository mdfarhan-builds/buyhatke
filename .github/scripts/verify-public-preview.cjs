const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { chromium, expect } = require('@playwright/test');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const url = process.env.PREVIEW_URL;
  const status = { verified: false, url, checked_at: new Date().toISOString() };
  let browser;
  try {
    let response;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (response.ok) break;
        await response.arrayBuffer();
      } catch {}
      await delay(10000);
    }
    assert(response?.ok, 'The public HTML did not return HTTP 200.');
    assert.match(response.headers.get('content-type') || '', /text\/html/);
    const html = await response.text();
    assert.match(html, /Every verified price/);
    const sources = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => new URL(match[1], url).href);
    assert(sources.length > 2, 'Expected real JavaScript and stylesheets.');
    for (const source of [...new Set(sources)]) {
      const asset = await fetch(source, { signal: AbortSignal.timeout(30000) });
      assert(asset.ok, `Asset failed: ${source}`);
      assert.match(asset.headers.get('content-type') || '', source.endsWith('.css') ? /text\/css/ : /(?:java|ecma)script/);
      await asset.arrayBuffer();
    }
    const executable = execFileSync('which', ['google-chrome'], { encoding: 'utf8' }).trim();
    browser = await chromium.launch({ executablePath: executable, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    const apiRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/\/api\/(?:compare|retailers)/.test(request.url())) apiRequests.push(request.url()); });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // The hosting service asks first-time visitors to confirm external content.
    const open = page.getByRole('button', { name: 'Open the page', exact: true });
    if (await open.isVisible()) await open.click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Every verified price.');
    await expect(page.locator('.preview-main')).toBeVisible();
    await page.getByRole('button', { name: 'Supported stores', exact: true }).click();
    await expect(page.locator('.connection-status')).toHaveText(Array(5).fill('Status unavailable'));
    await page.getByRole('button', { name: 'Got it', exact: true }).click();
    await page.getByRole('textbox').fill('https://www.amazon.in/dp/B0CHX1W1XY');
    await page.getByRole('button', { name: 'Compare prices', exact: true }).click();
    await expect(page.locator('main [role=alert]')).toContainText('This is an interface preview.');
    await page.screenshot({ path: 'verification-screenshot.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle' });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile layout overflowed.');
    assert.deepEqual(errors, []);
    assert.deepEqual(apiRequests, []);
    Object.assign(status, { verified: true, checks: ['public_html_200', 'css_and_javascript', 'browser_interactions', 'mobile_layout', 'no_api_requests', 'no_browser_errors'] });
    console.log('Verified public Pricewise UI:', url);
  } catch (error) {
    status.message = error.message;
    process.exitCode = 1;
  } finally {
    await browser?.close();
    fs.writeFileSync('deployment-status.json', JSON.stringify(status, null, 2) + '\n');
  }
})();
