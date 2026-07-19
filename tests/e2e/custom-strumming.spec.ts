import { expect, test, type Page } from "@playwright/test";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function expandGuidedPracticeOnMobile(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? 1_280) < 640) {
    await page
      .getByRole("button", { name: "Show guided practice settings" })
      .click();
  }
}

async function expectSelectedPattern(page: Page, name: string): Promise<void> {
  const select = page.getByRole("combobox", { name: /Pattern for 4\/4/ });
  await expect(select.locator("option:checked")).toHaveText(name);
}

test("creates, edits, deletes, and restores a custom strumming pattern", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  const originalName = "Portable Right Hand";
  const editedName = "Portable Right Hand Edit";

  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await expandGuidedPracticeOnMobile(page);
  await page
    .getByRole("radiogroup", { name: "Practice mode" })
    .getByRole("radio", { name: /Strumming/ })
    .locator("..")
    .click();

  await page.getByRole("button", { name: "New" }).click();
  await expect(
    page.getByRole("dialog", { name: "Create strumming pattern" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Pattern name" }).fill(originalName);
  await page
    .getByRole("combobox", { name: "Action for position 2, &" })
    .selectOption("up");
  await page.getByRole("checkbox", { name: "Accent position 3, 2" }).check();
  await page.getByRole("button", { name: "Save strumming pattern" }).click();
  await expect(
    page.getByRole("dialog", { name: "Create strumming pattern" }),
  ).toBeHidden();
  await expectSelectedPattern(page, originalName);

  await page.getByRole("button", { name: "Edit" }).click();
  const nameInput = page.getByRole("textbox", { name: "Pattern name" });
  await nameInput.fill(editedName);
  await page.getByRole("button", { name: "Save strumming pattern" }).click();
  await expectSelectedPattern(page, editedName);

  await page.reload();
  await expandGuidedPracticeOnMobile(page);
  await expect(page.getByRole("radio", { name: /Strumming/ })).toBeChecked();
  await expectSelectedPattern(page, editedName);
  await expect(
    page.getByRole("list", { name: `${editedName} action sequence` }).first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).not.toBeNull();

  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await expandGuidedPracticeOnMobile(page);
  await page.getByRole("button", { exact: true, name: "Delete" }).click();
  await page
    .getByRole("button", { name: `Delete ${editedName} permanently` })
    .click();
  await expectSelectedPattern(page, "Quarter-Note Downstrokes");

  await page.getByRole("link", { name: "Settings" }).click();
  await page
    .getByLabel("Choose backup file")
    .setInputFiles(backupPath as string);
  await expect(
    page.getByRole("dialog", { name: "Review backup" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Merge with current data/ }).check();
  await page.getByRole("button", { name: "Import data" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "imported by merge" }),
  ).toBeVisible();

  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await expandGuidedPracticeOnMobile(page);
  await expectSelectedPattern(page, editedName);
  await page.reload();
  await expandGuidedPracticeOnMobile(page);
  await expectSelectedPattern(page, editedName);
  expect(browserErrors).toEqual([]);
});
