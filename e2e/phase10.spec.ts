import { expect, test, type Page } from "@playwright/test";

async function seat(page: Page, names: string[]) {
  for (const n of names) {
    await page.getByLabel("Add a player by name").fill(n);
    await page.getByLabel("Add a player by name").press("Enter");
  }
}

async function recordHand(page: Page, out: string, rows: { name: string; completed: boolean; points?: number }[]) {
  await page.getByRole("button", { name: "Record hand" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByText("Went out", { exact: true }).first().waitFor();
  const outLabel = dlg.locator("li", { hasText: out }).getByText(/^Went out/);
  await outLabel.click();
  for (const r of rows) {
    if (r.name === out) continue;
    await dlg.getByRole("group", { name: `${r.name} completed phase` }).getByRole("button", { name: r.completed ? "Completed" : "Not yet" }).click();
    await dlg.getByLabel(`${r.name} card points`, { exact: true }).last().fill(String(r.points));
  }
  await dlg.getByRole("button", { name: "Add to scoreboard" }).click();
  await expect(dlg).toBeHidden();
}

test("Phase 10: four players, independent progression, persistence, history", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Start a new game/ }).click();
  await page.getByRole("link", { name: /Phase 10/ }).first().click();
  await page.getByRole("link", { name: "Start a session" }).click();
  await seat(page, ["Karthik", "Rahul", "Arjun", "Sanjay"]);
  await page.getByRole("button", { name: "Start game" }).click();
  await expect(page.getByRole("heading", { name: "Phase 10", level: 1 })).toBeVisible();

  await recordHand(page, "Karthik", [
    { name: "Karthik", completed: true },
    { name: "Rahul", completed: false, points: 40 },
    { name: "Arjun", completed: true, points: 10 },
    { name: "Sanjay", completed: false, points: 55 },
  ]);
  const board = page.getByRole("region", { name: "Scoreboard" });
  const card = (n: string) => board.locator("li", { hasText: n });
  await expect(card("Karthik")).toContainText("Phase 2");
  await expect(card("Arjun")).toContainText("Phase 2");
  await expect(card("Rahul")).toContainText("Phase 1");
  await expect(card("Sanjay")).toContainText("Phase 1");
  await expect(card("Sanjay")).toContainText("55");

  await recordHand(page, "Arjun", [
    { name: "Karthik", completed: true, points: 25 },
    { name: "Rahul", completed: true, points: 5 },
    { name: "Arjun", completed: true },
    { name: "Sanjay", completed: false, points: 30 },
  ]);
  await expect(card("Karthik")).toContainText("Phase 3");
  await expect(card("Rahul")).toContainText("Phase 2");
  await expect(card("Sanjay")).toContainText("Phase 1");
  await expect(card("Sanjay")).toContainText("85");
  await expect(card("Rahul")).toContainText("45");

  // Persistence: reload keeps the unfinished game.
  await page.reload();
  await expect(card("Sanjay")).toContainText("85");
  await page.goto("/history");
  await expect(page.getByText("In progress (1)")).toBeVisible();
});

test("Phase 10: duplicate-proof submit, undo, and a full game to a winner", async ({ page }) => {
  await page.goto("/new/phase10");
  await seat(page, ["Xavi", "Yara"]);
  await page.getByRole("button", { name: "Start game" }).click();
  for (let i = 1; i <= 10; i++) {
    await recordHand(page, "Xavi", [{ name: "Xavi", completed: true }, { name: "Yara", completed: true, points: 5 }]);
    if (i < 10) await expect(page.getByText(`Hand ${i + 1}`, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Xavi");
  await expect(page.getByText(/lowest score/i).first()).toBeVisible();
  await expect(page.getByText("Final standings")).toBeVisible();
  await page.goto("/history");
  await page.getByRole("tab", { name: /Finished/ }).click();
  await page.getByRole("link", { name: /Phase 10/ }).first().click();
  await expect(page.getByText("Round by round")).toBeVisible();
  // Undo reopens.
  await page.getByRole("button", { name: /Undo last entry/ }).click();
  await expect(page.getByRole("button", { name: "Record hand" })).toBeVisible();
});
