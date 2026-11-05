import { chromium } from "@playwright/test";
import fs from "node:fs";
const base = "http://localhost:3100";
const out = process.env.SHOT_DIR || "screenshots";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const sizes = { desktop: { width: 1366, height: 860 }, mobile: { width: 390, height: 844 } };
const games = (process.env.GAMES || "phase10").split(",");
for (const [name, viewport] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  for (const g of games) {
    await page.goto(`${base}/new/${g}`);
    const names = ["Karthik", "Rahul", "Arjun", "Sanjay"];
    for (const n of names) { await page.getByLabel("Add a player by name").fill(n); await page.getByLabel("Add a player by name").press("Enter"); }
    await page.screenshot({ path: `${out}/${name}-${g}-setup.png` });
    await page.getByRole("button", { name: "Start game" }).click();
    await page.waitForURL(/session/);
    await page.screenshot({ path: `${out}/${name}-${g}-play.png` });
    const btn = page.locator("button", { hasText: /Record|Enter final/ }).first();
    if (await btn.count()) { await btn.click(); await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${name}-${g}-entry.png` }); }
  }
  await ctx.close();
}
await browser.close();
