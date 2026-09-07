import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

async function main() {
  const screenshotsDir = path.resolve('docs/screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to Stackfold app...');
  await page.goto('http://localhost:3030', { waitUntil: 'networkidle' });

  // 1. Onboarding / Empty state
  console.log('Capturing 01-onboarding...');
  await page.screenshot({ path: path.join(screenshotsDir, '01-onboarding.png') });

  // 2. Open Onboarding Modal
  console.log('Capturing 02-native-selection...');
  await page.click('button:has-text("Open Local Repository")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '02-native-selection.png') });

  // 3. Scan E-Commerce Demo fixture
  console.log('Starting scan...');
  await page.click('button:has-text("E-Commerce Store")');
  await page.waitForTimeout(100);
  console.log('Capturing 03-scan-progress...');
  await page.screenshot({ path: path.join(screenshotsDir, '03-scan-progress.png') });

  // Wait for scan to finish and graph to render
  await page.waitForSelector('.react-flow__node', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 4. Architecture View
  console.log('Capturing 04-architecture-view...');
  await page.screenshot({ path: path.join(screenshotsDir, '04-architecture-view.png') });

  // 5. API Flows View
  console.log('Switching to API Flows view...');
  await page.click('button:has-text("API Flows")');
  await page.waitForTimeout(800);
  console.log('Capturing 05-api-view...');
  await page.screenshot({ path: path.join(screenshotsDir, '05-api-view.png') });

  // 6. Database View
  console.log('Switching to Database view...');
  await page.click('button:has-text("Database")');
  await page.waitForTimeout(800);
  console.log('Capturing 06-database-view...');
  await page.screenshot({ path: path.join(screenshotsDir, '06-database-view.png') });

  // 7. Node Inspector
  console.log('Clicking node for inspector...');
  const firstNode = await page.locator('.react-flow__node').first();
  if (firstNode) {
    await firstNode.click();
    await page.waitForTimeout(600);
  }
  console.log('Capturing 07-node-inspector...');
  await page.screenshot({ path: path.join(screenshotsDir, '07-node-inspector.png') });

  // 8. Diagnostics Drawer
  console.log('Opening Diagnostics Drawer...');
  const diagButton = await page.locator('button:has-text("Diagnostics")');
  if (await diagButton.count() > 0) {
    await diagButton.click();
    await page.waitForTimeout(600);
  }
  console.log('Capturing 08-diagnostics...');
  await page.screenshot({ path: path.join(screenshotsDir, '08-diagnostics.png') });

  // Close diagnostics
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 9. Cache-restored project
  console.log('Capturing 09-cache-restored...');
  await page.click('button:has-text("Architecture")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '09-cache-restored.png') });

  await browser.close();
  console.log('All screenshots captured successfully in docs/screenshots/');
}

main().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
