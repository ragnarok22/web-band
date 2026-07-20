import { expect, test } from "@playwright/test";

import {
  establishServiceWorkerControl,
  offlinePattern,
  seedOfflineData,
  trackPageErrors,
} from "./pwa-helpers";

test("loads saved custom data and preferences while offline", async ({
  context,
  page,
}) => {
  const pageErrors = trackPageErrors(page);
  await establishServiceWorkerControl(page, "/settings");
  await seedOfflineData(page);

  await context.setOffline(true);
  const patternsResponse = await page.goto("/patterns", {
    waitUntil: "domcontentloaded",
  });
  expect(patternsResponse?.fromServiceWorker()).toBe(true);
  await page.getByRole("searchbox").fill(offlinePattern.name);
  const patternCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: offlinePattern.name }),
  });
  await expect(patternCard.getByText("Your pattern")).toBeVisible();
  await expect(
    patternCard.getByRole("button", {
      name: `Remove ${offlinePattern.name} from favorites`,
    }),
  ).toHaveAttribute("aria-pressed", "true");

  const practiceResponse = await page.goto("/practice", {
    waitUntil: "domcontentloaded",
  });
  expect(practiceResponse?.fromServiceWorker()).toBe(true);
  await expect(
    page.getByRole("heading", { name: offlinePattern.name }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Current pattern" }),
  ).toHaveValue(offlinePattern.id);
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("132");
  await expect(
    page
      .getByRole("group", { name: "Count-in length" })
      .getByRole("radio", { name: "Off" }),
  ).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduce-motion",
    "true",
  );
  const beatVisualizer = page.getByRole("region", {
    name: "Beat visualization",
  });
  await expect(beatVisualizer).toHaveAttribute("data-detail", "sixteenths");
  await expect(beatVisualizer).toHaveAttribute("data-intensity", "strong");
  await expect(page.getByRole("note")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
