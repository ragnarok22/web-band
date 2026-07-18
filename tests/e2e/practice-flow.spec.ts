import { expect, test, type Page } from "@playwright/test";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("starts, changes tempo, pauses, resumes, and stops the groove", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
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
  expect(browserErrors).toEqual([]);
});

test("persists the last BPM after a reload", async ({ page }) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  await page.getByRole("button", { name: "Increase BPM by 1" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("91");

  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("91");
  expect(browserErrors).toEqual([]);
});

test("persists groove controls and supports focus keyboard practice", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");

  await page.getByText("Off", { exact: true }).click();
  await page.getByRole("combobox", { name: "Phrase fills" }).selectOption("8");
  await page.getByRole("slider", { name: "Swing" }).fill("0.25");
  await page.getByRole("button", { name: "Mute Kick" }).click();

  await page.locator("header").click();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );
  await page.keyboard.press("Space");
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove stopped",
  );

  await page.getByRole("button", { name: "Focus" }).click();
  await expect(page.getByText("Focus session")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeHidden();
  await page.keyboard.press("f");
  await expect(
    page.getByRole("combobox", { name: "Current pattern" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: "Off" })).toBeChecked();
  await expect(
    page.getByRole("combobox", { name: "Phrase fills" }),
  ).toHaveValue("8");
  await expect(page.getByRole("slider", { name: "Swing" })).toHaveValue("0.25");
  await expect(page.getByRole("button", { name: "Mute Kick" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(browserErrors).toEqual([]);
});
