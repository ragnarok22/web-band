import { expect, test } from "@playwright/test";

import { establishServiceWorkerControl, trackPageErrors } from "./pwa-helpers";

test("applies a waiting update and offers reload after takeover", async ({
  page,
}) => {
  const pageErrors = trackPageErrors(page);
  await establishServiceWorkerControl(page);
  await expect(page.getByText(/app update/i)).toHaveCount(0);

  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js?phase-10-update=1", {
      scope: "/",
    });
  });
  await expect(
    page.getByRole("button", { name: "Apply update" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Apply update" }).click();
  await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => navigator.serviceWorker.controller?.scriptURL ?? null,
      ),
    )
    .toContain("/sw.js?phase-10-update=1");

  await page.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          performance.getEntriesByType("navigation")[0] as
            PerformanceNavigationTiming | undefined
        )?.type,
    ),
  ).toBe("reload");
  expect(pageErrors).toEqual([]);
});
