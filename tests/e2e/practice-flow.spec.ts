import { expect, test } from "@playwright/test";

test("starts, changes tempo, pauses, resumes, and stops the groove", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("90");

  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Count in: listen for the downbeat",
  );
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
    {
      timeout: 8_000,
    },
  );

  await page.getByRole("button", { name: "Increase BPM by 5" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("95");

  await page.getByRole("button", { name: "Pause playback" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove paused",
  );
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );

  await page.getByRole("button", { name: "Stop playback" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove stopped",
  );
});

test("persists the last BPM after a reload", async ({ page }) => {
  await page.goto("/practice");
  await page.getByRole("button", { name: "Increase BPM by 1" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("91");

  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("91");
});
