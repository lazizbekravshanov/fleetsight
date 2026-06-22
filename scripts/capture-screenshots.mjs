// Regenerate the README screenshots (docs/*.png) from the live site or a local
// dev server.
//   node scripts/capture-screenshots.mjs
//   SITE_URL=http://localhost:3000 node scripts/capture-screenshots.mjs
//   CARRIER_DOT=80321 node scripts/capture-screenshots.mjs
// Requires Playwright + a browser:  npx playwright install chromium
import { chromium } from "playwright";

const BASE = (process.env.SITE_URL || "https://fleetsight.vercel.app").replace(/\/$/, "");
const CARRIER_DOT = process.env.CARRIER_DOT || "3157032"; // rich, multi-year readout (deteriorating trajectory)

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

// 1) Home / universal search
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: "docs/home.png" });
console.log("✓ docs/home.png");

// 2) National safety map (landing-page section; renders client-side after a fetch)
const map = page.locator("section").filter({ hasText: "National safety map" }).first();
if (await map.count()) {
  await map.scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000); // let the choropleth fetch + fill
  await map.screenshot({ path: "docs/safety-map.png" });
  console.log("✓ docs/safety-map.png");
} else {
  console.warn("! National safety map section not found — skipped");
}

// 3) Carrier intelligence page + the Predictive Intelligence section
await page.goto(`${BASE}/carrier/${CARRIER_DOT}`, { waitUntil: "networkidle" });
await page.waitForTimeout(4000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: "docs/carrier.png" });
console.log("✓ docs/carrier.png");

const section = page.locator("section").filter({ hasText: "Predictive Intelligence" }).first();
if (await section.count()) {
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await section.screenshot({ path: "docs/carrier-intelligence.png" });
  console.log("✓ docs/carrier-intelligence.png");
} else {
  console.warn("! Predictive Intelligence section not found — skipped");
}

await browser.close();
