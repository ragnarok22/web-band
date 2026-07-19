import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("exports, removes, and imports a shared custom pattern", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  const patternName = "Shareable Pocket";

  await page.goto("/editor");
  await page.getByRole("textbox", { name: "Pattern name" }).fill(patternName);
  await page
    .getByRole("textbox", { name: "Description" })
    .fill("A groove shared between Web Band browsers.");
  await page
    .getByRole("button", { name: /Kick, measure 1, column 1,.*empty/ })
    .click();
  await page.getByRole("button", { name: "Save pattern" }).click();
  await expect(page.getByText("Pattern saved locally.")).toBeVisible();

  await page.getByRole("link", { name: "Back to patterns" }).click();
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: patternName }) });
  const downloadPromise = page.waitForEvent("download");
  await card
    .getByRole("button", { name: `Export ${patternName} pattern` })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    "web-band-pattern-shareable-pocket.json",
  );
  const patternFilePath = await download.path();
  expect(patternFilePath).not.toBeNull();

  await card.getByRole("link", { name: `Edit ${patternName}` }).click();
  await page.getByRole("button", { name: "Delete pattern" }).click();
  const deleteDialog = page.getByRole("dialog", {
    name: `Delete ${patternName}?`,
  });
  await deleteDialog.getByRole("button", { name: "Delete pattern" }).click();
  await expect(page).toHaveURL(/\/patterns$/);
  await page.getByRole("searchbox").fill(patternName);
  await expect(
    page.getByRole("heading", { name: "No grooves match" }),
  ).toBeVisible();

  await page
    .getByLabel("Choose shared pattern file")
    .setInputFiles(patternFilePath as string);
  await expect(
    page.getByRole("dialog", { name: "Import this pattern?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to library" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Imported 1 pattern." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible();

  await page.reload();
  await page.getByRole("searchbox").fill(patternName);
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("imports a committed song preset and opens it in practice", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  const patternName = "Mana - En el muelle de San Blas";

  await page.goto("/patterns");
  await page
    .getByLabel("Choose shared pattern file")
    .setInputFiles(
      join(
        process.cwd(),
        "presets",
        "web-band-pattern-mana-en-el-muelle-de-san-blas.json",
      ),
    );

  const importDialog = page.getByRole("dialog", {
    name: "Import this pattern?",
  });
  await expect(importDialog.getByText(patternName)).toBeVisible();
  await importDialog.getByRole("button", { name: "Add to library" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Imported 1 pattern." }),
  ).toBeVisible();

  await page.getByRole("searchbox").fill(patternName);
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: patternName }) });
  await card.getByRole("button", { name: "Practice" }).click();

  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("97");
  expect(browserErrors).toEqual([]);
});
