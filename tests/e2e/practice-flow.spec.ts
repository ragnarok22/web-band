import { expect, test, type Page } from "@playwright/test";
import {
  closeControls,
  openControls,
  openPresetManager,
} from "./practice-helpers";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("expands the workspace when Controls close at 1024px", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1024 });
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  const workspace = page.getByRole("region", {
    name: "Practice session",
    exact: true,
  });
  const fullWidth = (await workspace.boundingBox())!.width;
  await openControls(page);
  await expect
    .poll(async () => (await workspace.boundingBox())!.width)
    .toBeLessThan(fullWidth - 300);
  await closeControls(page);
  await expect
    .poll(async () => (await workspace.boundingBox())!.width)
    .toBe(fullWidth);
});

test("keeps advanced controls reachable without overflow at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 320 });
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();

  await expect(
    page.getByRole("radiogroup", { name: "Practice mode" }),
  ).toBeVisible();

  await openControls(page, "Groove Feel");
  await expect(page.getByRole("slider", { name: "Swing" })).toBeVisible();

  await closeControls(page);
  await page.getByRole("button", { name: "Change Pattern" }).click();
  await page
    .getByRole("link", { name: "Browse all patterns" })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("link", { name: "Browse all patterns" }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("starts, changes tempo, pauses, resumes, and stops the groove", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("90");

  const countIn = page.getByRole("combobox", { name: "Count-in length" });
  await countIn.selectOption("1");
  await expect(countIn).toHaveValue("1");
  const beatVisualizer = page.getByRole("region", {
    name: "Beat visualization",
  });
  const countInDisplay = beatVisualizer.locator('[data-motion="count-in"]');

  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Counting in");
  await expect(page.getByTestId("playback-live-region")).toHaveText(
    "Count in: listen for the downbeat",
  );
  await expect(countInDisplay).toHaveAttribute("aria-hidden", "false");
  await expect(beatVisualizer.locator(".beat-step--active")).toHaveCount(0);

  await expect(page.getByTestId("transport-status")).toHaveText("Playing", {
    timeout: 7_000,
  });
  await expect(countInDisplay).toHaveAttribute("aria-hidden", "true");
  await expect
    .poll(() => beatVisualizer.locator(".beat-step--active").count())
    .toBe(1);

  await page.getByRole("button", { name: "More tempo controls" }).click();
  await page.getByRole("button", { name: "Increase BPM by 5" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("95");

  await page.getByRole("button", { name: "Pause playback" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Paused");
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");

  await page.getByRole("button", { name: "Stop playback" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Stopped");
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

  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await openControls(page, "Groove Feel");

  await page.getByRole("combobox", { name: "Phrase fills" }).selectOption("8");
  await page.getByRole("slider", { name: "Swing" }).fill("0.25");
  await page.getByRole("button", { name: "Mute Kick" }).click();
  await closeControls(page);

  await page.getByText("Practice room", { exact: true }).click();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("transport-status")).toHaveText("Paused");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("transport-status")).toHaveText("Stopped");

  await page.getByRole("button", { name: "Focus" }).click();
  await expect(page.getByText("Focus session")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeHidden();
  await page.keyboard.press("f");
  await expect(
    page.getByRole("button", { name: "Change Pattern" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Count-in length" }),
  ).toHaveValue("0");
  await openControls(page, "Groove Feel");
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

test("quick select searches patterns and supports keyboard selection", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  await page.getByRole("button", { name: "Change Pattern" }).click();
  const input = page.getByRole("combobox", { name: "Current pattern" });
  await expect(input).toHaveValue("Basic Rock - 4/4");
  await input.fill("no-pattern-matches-this");
  await expect(page.getByText("No patterns found.")).toBeVisible();
  await input.fill("One Drop");
  const option = page.getByRole("option", {
    name: "One Drop - 4/4",
    exact: true,
  });
  await expect(option).toBeVisible();
  await option.click();
  await expect(
    page.getByRole("heading", { name: "One Drop", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Change Pattern" }).click();
  await input.fill("Driving Eighths");
  await expect(
    page.getByRole("option", { name: "Driving Eighths - 4/4", exact: true }),
  ).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Driving Eighths", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("persists and restores a guided tempo practice preset", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  const practiceMode = page.getByRole("radiogroup", {
    name: "Practice mode",
  });

  await practiceMode
    .getByRole("radio", { name: /Tempo/ })
    .locator("..")
    .click();
  await page.getByRole("spinbutton", { name: "Start BPM" }).fill("84");
  await page.getByRole("button", { name: "Change Pattern" }).click();
  await page
    .getByRole("combobox", { name: "Current pattern" })
    .fill("One Drop");
  await page
    .getByRole("option", { name: "One Drop - 4/4", exact: true })
    .click();
  await page.getByRole("button", { name: "Save current setup" }).click();
  await page.getByRole("textbox", { name: "Preset name" }).fill("Tempo ladder");
  await page.getByRole("button", { name: "Save preset" }).click();
  await expect(
    page.getByRole("dialog", { name: "Save practice preset" }),
  ).toBeHidden();

  await practiceMode
    .getByRole("radio", { name: /Drums/ })
    .locator("..")
    .click();
  await openPresetManager(page);
  await page.getByRole("tab", { name: "All" }).click();
  await page.getByRole("button", { name: "Load Tempo ladder" }).click();

  await expect(page.getByText("Loaded: Tempo ladder")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Tempo/ })).toBeChecked();
  await expect(page.getByRole("spinbutton", { name: "Start BPM" })).toHaveValue(
    "84",
  );
  await expect(
    page.getByRole("heading", { name: "One Drop", exact: true }),
  ).toBeVisible();

  await page.reload();
  await openPresetManager(page);
  await expect(
    page.getByRole("heading", { name: "Tempo ladder" }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("advances the tempo trainer on a musical boundary", async ({ page }) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  const practiceMode = page.getByRole("radiogroup", {
    name: "Practice mode",
  });

  await practiceMode
    .getByRole("radio", { name: /Tempo/ })
    .locator("..")
    .click();
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page.getByRole("spinbutton", { name: "Start BPM" }).fill("200");
  await page.getByRole("spinbutton", { name: "Target BPM" }).fill("205");
  await page.getByRole("spinbutton", { name: "Change by" }).fill("5");
  await page.getByRole("spinbutton", { name: "Interval length" }).fill("1");
  await page.getByRole("checkbox", { name: "Stop at target" }).uncheck();

  await expect(page.getByTestId("trainer-current-bpm")).toContainText("200");
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("trainer-current-bpm")).toContainText("205", {
    timeout: 5_000,
  });
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");

  await page.getByRole("button", { name: "Stop playback" }).click();
  expect(browserErrors).toEqual([]);
});

test("moves the strumming sequence highlight at audible time", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  await page
    .getByRole("radiogroup", { name: "Practice mode" })
    .getByRole("radio", { name: /Strumming/ })
    .locator("..")
    .click();
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");

  const activeStep = page
    .getByRole("region", { name: "Strumming trainer guidance" })
    .locator('[aria-current="step"]');
  await expect(activeStep).toHaveCount(0);
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(activeStep).toHaveCount(1);
  const firstPosition = await activeStep.getAttribute("data-position");
  await expect
    .poll(() => activeStep.getAttribute("data-position"), { timeout: 3_000 })
    .not.toBe(firstPosition);

  await page.getByRole("button", { name: "Stop playback" }).click();
  expect(browserErrors).toEqual([]);
});
