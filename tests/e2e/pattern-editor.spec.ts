import { expect, test, type Page } from "@playwright/test";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("creates, opens, and persists a custom drum pattern", async ({ page }) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/patterns");
  await page.getByRole("link", { name: "Create pattern" }).click();
  await expect(page).toHaveURL(/\/editor$/);

  await page
    .getByRole("textbox", { name: "Pattern name" })
    .fill("Sunset Pocket");
  await page
    .getByRole("textbox", { name: "Description" })
    .fill("A warm custom backbeat for evening practice.");
  await page.getByRole("button", { name: "Kick, step 1, empty" }).click();
  await page.getByRole("button", { name: "Snare, step 5, empty" }).click();
  await page.getByRole("button", { name: "Save pattern" }).click();

  await expect(page).toHaveURL(/\/editor\?pattern=custom-/);
  await expect(page.getByText("Pattern saved locally.")).toBeVisible();
  await page.getByRole("link", { name: "Back to patterns" }).click();
  await page.getByRole("searchbox").fill("Sunset Pocket");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Sunset Pocket" }) });
  await expect(card.getByText("Your pattern")).toBeVisible();
  await card.getByRole("link", { name: "Edit Sunset Pocket" }).click();

  await expect(page.getByRole("textbox", { name: "Pattern name" })).toHaveValue(
    "Sunset Pocket",
  );
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Pattern name" })).toHaveValue(
    "Sunset Pocket",
  );
  await expect(
    page.getByRole("button", { name: /Kick, step 1, 70 percent velocity/ }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
