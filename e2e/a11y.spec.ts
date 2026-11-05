import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = ["/", "/games", "/games/phase10", "/rules", "/rules/phase10", "/players", "/history", "/new/phase10"];
for (const path of pages) {
  test(`axe: ${path} has no serious/critical violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.html.slice(0, 120)).join(" | ")}`)).toEqual([]);
  });
}

test("axe: active play screen and results", async ({ page }) => {
  await page.goto("/new/phase10");
  for (const n of ["Ann", "Ben"]) { await page.getByLabel("Add a player by name").fill(n); await page.getByLabel("Add a player by name").press("Enter"); }
  await page.getByRole("button", { name: "Start game" }).click();
  await page.waitForURL(/session/);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 140)}`)).toEqual([]);
});
