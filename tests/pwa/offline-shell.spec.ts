import { expect, test } from "@playwright/test";

test("loads the practice shell offline after the first visit", async ({
  context,
  page,
}) => {
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Play" }),
  ).toBeEnabled();
});
