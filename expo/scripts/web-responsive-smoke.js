const http = require('http');
const path = require('path');
const fs = require('fs');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const SMOKE_PATH = process.env.WEB_SMOKE_PATH || '/welcome';
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
];

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  if (filePath.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}

function startStaticServer(rootDir) {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const safePath = path
      .normalize(decodeURIComponent(requestUrl.pathname))
      .replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(rootDir, safePath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(rootDir, 'index.html');
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      response.writeHead(200, { 'Content-Type': contentType(filePath) });
      response.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function run() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('dist/index.html not found. Run npm run web:export first.');
  }

  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    throw new Error('Playwright is not installed. Run npm install or bun install first.');
  }

  const { server, url } = await startStaticServer(DIST_DIR);
  const browser = await playwright.chromium.launch();
  const results = [];

  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport });
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => {
        consoleErrors.push(error.message);
      });

      await page.goto(`${url}${SMOKE_PATH}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('load', { timeout: 10000 }).catch(() => undefined);
      await page.waitForTimeout(1000);

      const bodyTextLength = await page.locator('body').innerText().then((text) => text.trim().length);
      const overlayVisible = await page
        .locator('text=/Error:|Unhandled Runtime Error|Metro encountered an error/i')
        .count();
      const hasInteractiveControl = await page
        .locator('button, a, [role="button"], input, textarea, [tabindex]')
        .first()
        .isVisible()
        .catch(() => false);
      const hasActionText = await page
        .locator('text=/sign in|sign up|get started|continue|log in|giriş|kayıt|başla|devam|oturum/i')
        .first()
        .isVisible()
        .catch(() => false);
      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      const failures = [];
      if (bodyTextLength < 20) failures.push('blank-or-nearly-blank body');
      if (overlayVisible > 0) failures.push('framework error overlay visible');
      if (consoleErrors.length > 0) failures.push(`console errors: ${consoleErrors.join(' | ')}`);
      if (layout.scrollWidth > layout.clientWidth + 2) {
        failures.push(`horizontal overflow ${layout.scrollWidth}px > ${layout.clientWidth}px`);
      }
      if (!hasInteractiveControl && !hasActionText) failures.push('no visible interactive control');

      results.push({
        viewport: `${viewport.name} ${viewport.width}x${viewport.height}`,
        passed: failures.length === 0,
        failures,
      });

      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`${status} ${result.viewport}`);
    for (const failure of result.failures) {
      console.log(`  - ${failure}`);
    }
  }

  const failed = results.filter((result) => !result.passed);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
