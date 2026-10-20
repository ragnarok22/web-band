import { expect, test } from "@playwright/test";

import { establishServiceWorkerControl, trackPageErrors } from "./pwa-helpers";

test("opens and plays the metronome offline without first visiting that mode", async ({
  context,
  page,
}) => {
  const errors = trackPageErrors(page);
  await establishServiceWorkerControl(page);
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .getByRole("radio", { name: "Metronome", exact: true })
    .locator("..")
    .click();
  await page
    .getByRole("radio", { name: "3 — Eighth-note triplets", exact: true })
    .locator("..")
    .click();
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  await expect(
    page.locator('[aria-label="Beat visualization"] [data-active="true"]'),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Stop playback" }).click();
  expect(errors).toEqual([]);
});

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
  await expect(page.getByText("Showing 12 of 44 patterns")).toBeVisible();

  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Practice guitar. Find your rhythm." }),
  ).toBeVisible();
  const details = page.getByRole("button", { name: "How Web Band works" });
  await details.click();
  await expect(details).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("heading", { name: "Accurate Musical Timing" }),
  ).toBeVisible();
  await details.click();
  await expect(details).toHaveAttribute("aria-expanded", "false");

  await page.goto("/history", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Practice history" }),
  ).toBeVisible();

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();

  await page.goto("/editor", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Shape your groove" }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});
