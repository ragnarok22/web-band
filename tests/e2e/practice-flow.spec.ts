import { expect, test, type Page } from "@playwright/test";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function expandMobileSettings(page: Page, name: string): Promise<void> {
  if ((page.viewportSize()?.width ?? 1_280) < 640) {
    await page.getByRole("button", { name }).click();
  }
}

test("uses a two-column control layout within a 1024px viewport", async ({
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

  const patternTools = await page
    .getByRole("complementary", { name: "Pattern and mixer" })
    .boundingBox();
  const practiceSettings = await page
    .getByRole("complementary", { name: "Practice settings" })
    .boundingBox();
  expect(patternTools).not.toBeNull();
  expect(practiceSettings).not.toBeNull();
  expect(Math.abs(patternTools!.y - practiceSettings!.y)).toBeLessThan(2);
  expect(patternTools!.x).toBeLessThan(practiceSettings!.x);
});

test("keeps advanced controls reachable without overflow at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 320 });
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();

  const guidedPractice = page.getByRole("button", {
    name: "Show guided practice settings",
  });
  await expect(guidedPractice).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("radiogroup", { name: "Practice mode" }),
  ).toBeHidden();
  await guidedPractice.click();
  await expect(
    page.getByRole("radiogroup", { name: "Practice mode" }),
  ).toBeVisible();

  const groove = page.getByRole("button", { name: "Show groove settings" });
  await expect(groove).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("slider", { name: "Swing" })).toBeHidden();
  await groove.click();
  await expect(page.getByRole("slider", { name: "Swing" })).toBeVisible();

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

  await page.getByText("Off", { exact: true }).click();
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
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

  await expandMobileSettings(page, "Show groove settings");

  await page.getByText("Off", { exact: true }).click();
  await page.getByRole("combobox", { name: "Phrase fills" }).selectOption("8");
  await page.getByRole("slider", { name: "Swing" }).fill("0.25");
  await page.getByRole("button", { name: "Mute Kick" }).click();

  await page.getByText("Practice room", { exact: true }).click();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );
  await page.keyboard.press("Space");
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove paused",
  );
  await page.keyboard.press("Space");
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );
  await page.keyboard.press("Escape");
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
  await expandMobileSettings(page, "Show groove settings");
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

test("persists and restores a guided tempo practice preset", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  await expandMobileSettings(page, "Show guided practice settings");
  const practiceMode = page.getByRole("radiogroup", {
    name: "Practice mode",
  });

  await practiceMode
    .getByRole("radio", { name: /Tempo/ })
    .locator("..")
    .click();
  await page.getByRole("spinbutton", { name: "Start BPM" }).fill("84");
  await page
    .getByRole("combobox", { name: "Current pattern" })
    .selectOption("one-drop");
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
  await page.getByRole("button", { name: "Open presets" }).click();
  await page.getByRole("tab", { name: "All" }).click();
  await page.getByRole("button", { name: "Load Tempo ladder" }).click();

  await expect(page.getByText("Loaded: Tempo ladder")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Tempo/ })).toBeChecked();
  await expect(page.getByRole("spinbutton", { name: "Start BPM" })).toHaveValue(
    "84",
  );
  await expect(
    page.getByRole("combobox", { name: "Current pattern" }),
  ).toHaveValue("one-drop");

  await page.reload();
  await page.getByRole("button", { name: "Open presets" }).click();
  await expect(
    page.getByRole("heading", { name: "Tempo ladder" }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("advances the tempo trainer on a musical boundary", async ({ page }) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  await expandMobileSettings(page, "Show guided practice settings");
  const practiceMode = page.getByRole("radiogroup", {
    name: "Practice mode",
  });

  await practiceMode
    .getByRole("radio", { name: /Tempo/ })
    .locator("..")
    .click();
  await page.getByText("Off", { exact: true }).click();
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
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );

  await page.getByRole("button", { name: "Stop playback" }).click();
  expect(browserErrors).toEqual([]);
});

test("moves the strumming sequence highlight at audible time", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  await expandMobileSettings(page, "Show guided practice settings");
  await page
    .getByRole("radiogroup", { name: "Practice mode" })
    .getByRole("radio", { name: /Strumming/ })
    .locator("..")
    .click();
  await page.getByText("Off", { exact: true }).click();

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
