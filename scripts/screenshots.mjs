import { chromium } from "@playwright/test";
import fs from "node:fs";
const base = process.env.BASE_URL || "http://localhost:3100";
const out = process.env.SHOT_DIR || "screenshots";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const sizes = { desktop: { width: 1366, height: 860 }, tablet: { width: 820, height: 1180 }, mobile: { width: 390, height: 844 } };
const routes = (process.env.ROUTES || "/,/games,/games/phase10,/rules/phase10,/players,/history").split(",");
for (const [name, viewport] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto(base + r, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${out}/${name}-${r.replace(/\W+/g, "_") || "home"}.png`, fullPage: false });
  }
  await ctx.close();
}
await browser.close();
