import { expect, test } from "@playwright/test";

import { establishServiceWorkerControl, trackPageErrors } from "./pwa-helpers";

test("parses a precached backup worker while offline", async ({
  context,
  page,
}) => {
  const pageErrors = trackPageErrors(page);
  await establishServiceWorkerControl(page, "/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const backup = await downloadPromise;
  const backupPath = await backup.path();
  expect(backupPath).not.toBeNull();

  await context.setOffline(true);
  const workerPromise = page.waitForEvent("worker");
  await page
    .getByLabel("Choose backup file")
    .setInputFiles(backupPath as string);
  const worker = await workerPromise;

  expect(new URL(worker.url()).origin).toBe(new URL(page.url()).origin);
  await expect(
    page.getByRole("dialog", { name: "Review backup" }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});
