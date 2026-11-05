import { expect, test, type Page } from "@playwright/test";

async function start(page: Page, game: string, names: string[]) {
  await page.goto(`/new/${game}`);
  for (const n of names) {
    await page.getByLabel("Add a player by name").fill(n);
    await page.getByLabel("Add a player by name").press("Enter");
  }
  await page.getByRole("button", { name: "Start game" }).click();
  await page.waitForURL(/\/session\//);
}

test("UNO: traditional scoring to a target, with winner determination", async ({ page }) => {
  await start(page, "uno", ["Ann", "Ben", "Cy"]);
  // lower the target via the setup is covered by unit tests; here, play 500 quickly using big hands.
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Record round" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.locator("label", { hasText: "Ann" }).first().click();
    await dlg.getByLabel("Ben hand points", { exact: true }).last().fill("150");
    await dlg.getByLabel("Cy hand points", { exact: true }).last().fill("120");
    await dlg.getByRole("button", { name: "Add to scoreboard" }).click();
    await expect(dlg).toBeHidden();
  }
  // Ann: 270 + 270 = 540 >= 500 -> finished
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ann");
  await expect(page.getByText("540").first()).toBeVisible();
});

test("ONO 99: legality, turn order, losing a life, winner", async ({ page }) => {
  await start(page, "ono99", ["Ann", "Ben"]);
  await expect(page.getByRole("heading", { name: "Ann's turn" })).toBeVisible();
  await page.getByRole("button", { name: "9", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ben's turn" })).toBeVisible();
  await page.getByRole("button", { name: "ONO 99", exact: true }).click(); // pile -> 99
  await expect(page.getByRole("button", { name: "1", exact: true })).toBeDisabled();
  for (let i = 0; i < 3; i++) {
    // whoever is on turn cannot play safely
    const who = (await page.getByRole("heading", { name: /'s turn/ }).innerText()).replace("'s turn", "");
    await page.getByRole("button", { name: new RegExp(`${who} can't play safely`) }).click();
    if (i < 2) { await expect(page.getByRole("heading", { name: /'s turn/ })).toBeVisible(); await page.getByRole("button", { name: "ONO 99", exact: true }).click(); }
  }
  await expect(page.getByText("Final standings")).toBeVisible();
});

test("Poker: rebuy, cash-outs balance, net result ranks the winner", async ({ page }) => {
  await start(page, "poker", ["Ann", "Ben", "Cy"]);
  const row = (n: string) => page.locator("section[aria-label=Controls] li", { hasText: n });
  await row("Ann").getByRole("button", { name: "Rebuy" }).click();
  await row("Ann").getByLabel("Ann chips", { exact: true }).last().fill("6500");
  await row("Ann").getByRole("button", { name: "Cash out" }).click();
  await row("Ben").getByLabel("Ben chips", { exact: true }).last().fill("1000");
  await row("Ben").getByRole("button", { name: "Cash out" }).click();
  await row("Cy").getByLabel("Cy chips", { exact: true }).last().fill("500");
  await row("Cy").getByRole("button", { name: "Cash out" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ann");
  await expect(page.getByText("+25.00").first()).toBeVisible();
  await expect(page.getByText("−15.00").first()).toBeVisible();
});

test("Poker: unbalanced final cash-out asks for confirmation", async ({ page }) => {
  await start(page, "poker", ["Ann", "Ben"]);
  const row = (n: string) => page.locator("section[aria-label=Controls] li", { hasText: n });
  await row("Ann").getByRole("button", { name: "Cash out" }).click();
  await row("Ben").getByLabel("Ben chips", { exact: true }).last().fill("1000");
  await row("Ben").getByRole("button", { name: "Cash out" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Chips do not balance" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm anyway" }).click();
  await expect(page.getByText("Final standings")).toBeVisible();
});

test("Ticket to Ride: component scoring and longest-path bonus decide the winner", async ({ page }) => {
  await start(page, "ticket-to-ride", ["Ann", "Ben"]);
  await page.getByRole("button", { name: "Enter final scoring" }).click();
  const dlg = page.getByRole("dialog");
  const s = (n: string) => dlg.locator("section", { hasText: n }).first();
  await s("Ann").getByLabel("Ann length 3 routes", { exact: true }).last().fill("2");
  await s("Ann").getByLabel("Ann length 6 routes", { exact: true }).last().fill("1");
  await s("Ann").getByLabel("Ann completed ticket points", { exact: true }).last().fill("33");
  await s("Ann").getByLabel("Ann failed ticket points", { exact: true }).last().fill("8");
  await s("Ann").getByRole("checkbox").check();
  await s("Ben").getByLabel("Ben length 2 routes", { exact: true }).last().fill("4");
  await s("Ben").getByLabel("Ben completed ticket points", { exact: true }).last().fill("22");
  await expect(s("Ann").getByText("58", { exact: true })).toBeVisible(); // routes 2×4+15, tickets +33−8, longest +10
  await dlg.getByRole("button", { name: "Add to scoreboard" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ann");
});
