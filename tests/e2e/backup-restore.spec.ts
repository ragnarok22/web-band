import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

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
  await page
    .getByRole("button", { name: /Kick, measure 1, column 1,.*empty/ })
    .click();
  await page.getByRole("button", { name: "Save pattern" }).click();
  await expect(page.getByText("Pattern saved locally.")).toBeVisible();

  await page.getByRole("link", { exact: true, name: "Patterns" }).click();
  await page.getByRole("searchbox").fill(patternName);
  await page.getByRole("button", { name: "Practice" }).click();
  await page.getByRole("button", { name: "Dismiss audio tip" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(
    page.getByRole("heading", { name: "Settings, kept simple." }),
  ).toBeVisible();
  await page.selectOption("#color-theme", "light");
  await page.getByRole("checkbox", { name: "Reduce motion" }).check();

  const exportDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const exportedBackup = await exportDownloadPromise;
  expect(exportedBackup.suggestedFilename()).toMatch(
    /^web-band-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const exportedBackupPath = await exportedBackup.path();
  expect(exportedBackupPath).not.toBeNull();
  const backupJson = JSON.parse(
    await readFile(exportedBackupPath as string, "utf8"),
  ) as {
    data: {
      customPatterns: Array<{ id: string }>;
      preferences: {
        appearance: { reducedMotion: boolean; theme: string };
        onboardingDismissed: boolean;
        recentPatternIds: string[];
      };
    };
    version: number;
  };
  const customPatternId = backupJson.data.customPatterns[0]?.id;
  expect(customPatternId).toBeTruthy();
  expect(backupJson.version).toBe(3);
  expect(backupJson.data.preferences).toMatchObject({
    appearance: { reducedMotion: true, theme: "light" },
    onboardingDismissed: true,
  });
  expect(backupJson.data.preferences.recentPatternIds).toContain(
    customPatternId,
  );

  await page.getByLabel("Choose backup file").setInputFiles({
    buffer: Buffer.from("not-json"),
    mimeType: "application/json",
    name: "invalid-backup.json",
  });
  await expect(page.getByText("This file is not valid JSON.")).toBeVisible();
  await page.getByRole("link", { exact: true, name: "Patterns" }).click();
  await page.getByRole("searchbox").fill(patternName);
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible();
  await page.reload();
  await page.getByRole("searchbox").fill(patternName);
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await page.evaluate(() => {
    window.localStorage.setItem("web-band-practice-settings-v2", "legacy");
    window.localStorage.setItem("web-band-practice-settings-v1", "legacy");
    window.localStorage.setItem("unrelated-app", "keep");
  });
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
  const clearedStorage = await page.evaluate(() => ({
    appearance: window.localStorage.getItem("web-band-appearance-v1"),
    guided: window.localStorage.getItem("web-band-guided-practice-v1"),
    history: window.localStorage.getItem("web-band-history-settings-v1"),
    legacyV1: window.localStorage.getItem("web-band-practice-settings-v1"),
    legacyV2: window.localStorage.getItem("web-band-practice-settings-v2"),
    onboarding: window.localStorage.getItem("web-band-onboarding-dismissed"),
    practice: window.localStorage.getItem("web-band-practice-settings-v3"),
    recents: window.localStorage.getItem("web-band-recent-patterns-v1"),
    unrelated: window.localStorage.getItem("unrelated-app"),
  }));
  expect(clearedStorage).toEqual({
    appearance: null,
    guided: null,
    history: null,
    legacyV1: null,
    legacyV2: null,
    onboarding: null,
    practice: null,
    recents: null,
    unrelated: "keep",
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduce-motion",
    "false",
  );

  await page.getByRole("link", { name: "Practice" }).click();
  await expect(page.getByRole("note")).toContainText(
    "Sound begins after you press Play",
  );
  await page.getByRole("link", { exact: true, name: "Patterns" }).click();
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
  await expect(page.locator("#color-theme")).toHaveValue("light");
  await expect(
    page.getByRole("checkbox", { name: "Reduce motion" }),
  ).toBeChecked();

  await page.getByRole("link", { exact: true, name: "Patterns" }).click();
  await page.getByRole("searchbox").fill(patternName);
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(
        window.localStorage.getItem("web-band-recent-patterns-v1") ?? "[]",
      ),
    ),
  ).toContain(customPatternId);
  await page.reload();
  await page.getByRole("searchbox").fill(patternName);
  await expect(page.getByRole("heading", { name: patternName })).toBeVisible();
  await page.getByRole("link", { name: "Practice" }).click();
  await expect(page.getByRole("note")).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});
