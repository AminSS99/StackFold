// Captures real, high-resolution states of the Stackfold web app for the promo video.
// Usage: node promo/capture/capture.mjs [baseUrl]
// Default base URL is the static hosted demo served at http://localhost:4173/StackFold/
// (paths are sanitised to /demo/<fixture>, so no local filesystem paths appear in frames).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const { chromium } = createRequire(path.join(repoRoot, 'package.json'))('playwright');

const base = (process.argv[2] ?? 'http://localhost:4173/StackFold/').replace(/\/?$/, '/');
const outDir = path.join(here, '../public/shots');
fs.mkdirSync(outDir, { recursive: true });

const VIEWPORT = { width: 1600, height: 900 };
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, reducedMotion: 'reduce' })).newPage();

const boxes = {};
const shot = async name => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  console.log('shot', name);
};
const box = async (name, locator) => {
  const b = await locator.first().boundingBox();
  if (b) boxes[name] = { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  else console.warn('no box for', name);
};

// 1. Empty workspace -> scan the e-commerce fixture
await page.goto(base, { waitUntil: 'networkidle' });
await box('ecomCard', page.locator('button:has-text("E-Commerce Demo")'));
await shot('01-home');
await page.click('button:has-text("E-Commerce Demo")');
await page.waitForSelector('.react-flow__node');
await page.waitForTimeout(1500);
await shot('02-graph');

// 2. Select a node, then Impact and Evidence tabs
const prisma = page.locator('.react-flow__node[data-id*="prisma"]').first();
await box('prismaNode', prisma);
await prisma.click();
await page.waitForTimeout(600);
await shot('03-select');
await box('impactTab', page.locator('button:has-text("Impact")'));
await page.click('button:has-text("Impact")');
await shot('04-impact');
await box('evidenceTab', page.locator('button:has-text("Evidence")'));
await page.click('button:has-text("Evidence")');
await shot('05-evidence');

// 3. Security Lab: queue replay
await page.goto(`${base}security-lab/queue/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await box('queueRunButton', page.locator('button:has-text("Run queue check")'));
await shot('06-queue');
const failRow = page.locator('button:has-text("Historical v1 charge without receipt email")');
await box('queueFailRow', failRow);
await failRow.click();
await page.waitForTimeout(600);
await page.mouse.move(800, 500);
await page.mouse.wheel(0, 420);
await shot('07-queue-detail');

// 4. Signature and cache isolation labs
await page.goto(`${base}security-lab/signature/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await shot('08-signature');
await page.goto(`${base}security-lab/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await shot('09-cache');

fs.writeFileSync(path.join(outDir, 'boxes.json'), JSON.stringify({ viewport: VIEWPORT, ...boxes }, null, 2));
await browser.close();
