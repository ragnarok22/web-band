import { expect, test, type Page } from "@playwright/test";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("exports, clears, and restores a custom pattern backup", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  const patternName = "Phase Six Pocket";

  await page.goto("/editor");
  await expect(
    page.getByRole("heading", { name: "Shape your groove" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Pattern name" }).fill(patternName);
  await page
    .getByRole("textbox", { name: "Description" })
    .fill("A portable local groove for backup testing.");
  await page.getByRole("button", { name: "Kick, step 1, empty" }).click();
  await page.getByRole("button", { name: "Save pattern" }).click();
  await expect(page.getByText("Pattern saved locally.")).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await expect(
    page.getByRole("heading", { name: "Settings, kept simple." }),
  ).toBeVisible();

  const exportDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const exportedBackup = await exportDownloadPromise;
  expect(exportedBackup.suggestedFilename()).toMatch(
    /^web-band-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const exportedBackupPath = await exportedBackup.path();
  expect(exportedBackupPath).not.toBeNull();

  await page.getByLabel("Choose backup file").setInputFiles({
    buffer: Buffer.from("not-json"),
    mimeType: "application/json",
    name: "invalid-backup.json",
  });
  await expect(page.getByText("This file is not valid JSON.")).toBeVisible();
  await page.getByRole("link", { name: "Patterns" }).click();
  await page.getByRole("searchbox").fill(patternName);
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible();
  await page.reload();
  await page.getByRole("searchbox").fill(patternName);
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Delete all local data" }).click();
  await page
    .getByRole("checkbox", {
      name: /I understand this removes all Web Band data/,
    })
    .check();
  const safetyDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Delete local data" }).click();
  await safetyDownloadPromise;
  await expect(
    page.getByText("All Web Band data on this device was deleted."),
  ).toBeVisible();

  await page.getByRole("link", { name: "Patterns" }).click();
  await page.getByRole("searchbox").fill(patternName);
  await expect(
    page.getByRole("heading", { name: "No grooves match" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await page
    .getByLabel("Choose backup file")
    .setInputFiles(exportedBackupPath as string);
  await expect(
    page.getByRole("dialog", { name: "Review backup" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Merge with current data/ }).check();
  await page.getByRole("button", { name: "Import data" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "imported by merge" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Patterns" }).click();
  await page.getByRole("searchbox").fill(patternName);
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible();
  await page.reload();
  await page.getByRole("searchbox").fill(patternName);
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
