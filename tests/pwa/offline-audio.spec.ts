import { expect, test, type Request } from "@playwright/test";

import {
  establishServiceWorkerControl,
  offlinePattern,
  seedOfflineData,
  trackPageErrors,
} from "./pwa-helpers";

test("starts synthesized playback offline without network requests", async ({
  context,
  page,
}) => {
  const pageErrors = trackPageErrors(page);
  await establishServiceWorkerControl(page, "/settings");
  await seedOfflineData(page);
  await context.setOffline(true);
  const response = await page.goto("/practice", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.fromServiceWorker()).toBe(true);
  await expect(
    page.getByRole("heading", { name: offlinePattern.name }),
  ).toBeVisible();
  const playButton = page
    .getByRole("region", { name: "Playback controls" })
    .getByRole("button", { exact: true, name: "Play" });
  await expect(playButton).toBeEnabled();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);

  const playbackRequests: string[] = [];
  const trackRequest = (request: Request) => {
    const protocol = new URL(request.url()).protocol;
    if (protocol === "http:" || protocol === "https:") {
      playbackRequests.push(request.url());
    }
  };
  context.on("request", trackRequest);
  await playButton.click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );
  await expect.poll(() => page.locator(".beat-step--active").count()).toBe(1);
  await page.waitForTimeout(350);
  context.off("request", trackRequest);

  expect(playbackRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  await page.getByRole("button", { name: "Stop playback" }).click();
});
