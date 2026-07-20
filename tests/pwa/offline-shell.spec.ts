import { expect, test } from "@playwright/test";

import { establishServiceWorkerControl, trackPageErrors } from "./pwa-helpers";

test("loads every local-first route offline after the first visit", async ({
  context,
  page,
}) => {
  const pageErrors = trackPageErrors(page);
  await establishServiceWorkerControl(page);
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();

  await context.setOffline(true);
  const response = await page.reload({ waitUntil: "domcontentloaded" });
  expect(response?.fromServiceWorker()).toBe(true);
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Play" }),
  ).toBeEnabled();

  await page.goto("/patterns", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Find your pocket" }),
  ).toBeVisible();
  await expect(page.getByText("44 of 44 patterns")).toBeVisible();

  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "A drum room without the room." }),
  ).toBeVisible();

  await page.goto("/history", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "The work you put in." }),
  ).toBeVisible();

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Settings, kept simple." }),
  ).toBeVisible();

  await page.goto("/editor", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Shape your groove" }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});
