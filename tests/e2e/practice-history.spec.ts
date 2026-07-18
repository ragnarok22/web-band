import { expect, test, type Page } from "@playwright/test";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("records, persists, and deletes a real practice session", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "web-band-history-settings-v1",
      JSON.stringify({
        settings: { enabled: true, minimumDurationSeconds: 0 },
        version: 1,
      }),
    );
  });
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await page.getByText("Off", { exact: true }).click();
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );
  await page.waitForTimeout(1_100);
  await page.getByRole("button", { name: "Stop playback" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove stopped",
  );

  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await page.getByRole("button", { name: "Delete Basic Rock session" }).click();
  await page.getByRole("button", { name: "Delete session" }).click();
  await expect(
    page.getByRole("heading", { name: "No sessions yet" }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
