import { expect, test, type Page } from "@playwright/test";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("filters patterns and persists a favorite", async ({ page }) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/patterns");
  await expect(
    page.getByRole("heading", { name: "Find your pocket" }),
  ).toBeVisible();
  await expect(page.getByText("44 of 44 patterns")).toBeVisible();

  const showFilters = page.getByRole("button", { name: "Show filters" });
  if (await showFilters.isVisible()) await showFilters.click();
  await page.getByRole("combobox", { name: "Genre" }).selectOption("reggae");
  await expect(page.getByText("4 of 44 patterns")).toBeVisible();
  const favoriteButton = page.getByRole("button", {
    name: "One Drop favorite",
  });
  await favoriteButton.click();
  await expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
  await expect(favoriteButton).toBeEnabled();

  await page.reload();
  await page.getByRole("searchbox").fill("One Drop");
  await expect(
    page.getByRole("button", { name: "One Drop favorite" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(browserErrors).toEqual([]);
});

test("swipes through patterns without document overflow at 320px", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.setViewportSize({ height: 720, width: 320 });
  await page.goto("/patterns");
  await expect(
    page.getByRole("heading", { name: "Find your pocket" }),
  ).toBeVisible();

  const patterns = page.getByRole("region", { name: "Patterns" });
  await expect(patterns.getByRole("article")).toHaveCount(44);
  const rail = await patterns.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(rail.scrollWidth).toBeGreaterThan(rail.clientWidth);
  await patterns.evaluate((element) => element.scrollTo({ left: 300 }));
  await expect
    .poll(() => patterns.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(browserErrors).toEqual([]);
});

test("opens a library pattern in practice and restores it after reload", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/patterns");
  await page.getByRole("searchbox").fill("One Drop");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "One Drop" }) });
  await card.getByRole("button", { name: "Practice" }).click();

  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { name: "One Drop" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("76");

  await page.reload();
  await expect(page.getByRole("heading", { name: "One Drop" })).toBeVisible({
    timeout: 15_000,
  });
  expect(browserErrors).toEqual([]);
});

test("navigates patterns by keyboard and commits active changes on a boundary", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  const patternSelect = page.getByRole("combobox", {
    name: "Current pattern",
  });
  const bpmInput = page.getByRole("spinbutton", { name: "Current BPM" });

  await page.getByText("Practice room", { exact: true }).click();
  await page.keyboard.press("ArrowRight");
  await expect(patternSelect).toHaveValue("driving-eighths");
  await expect(
    page.getByRole("heading", { name: "Driving Eighths" }),
  ).toBeVisible();

  await page.keyboard.press("ArrowLeft");
  await expect(patternSelect).toHaveValue("basic-rock");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();

  await bpmInput.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(bpmInput).toBeFocused();
  await expect(patternSelect).toHaveValue("basic-rock");

  await bpmInput.fill("220");
  await page.keyboard.press("Enter");
  await expect(bpmInput).toHaveValue("220");
  await page.getByText("Off", { exact: true }).click();
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );

  await page.getByText("Practice room", { exact: true }).click();
  await page.keyboard.press("ArrowRight");
  await expect(patternSelect).toHaveValue("driving-eighths");
  await expect(
    page.getByText("Queued after a transition fill", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await expect(page.getByTestId("practice-live-region")).toHaveText(
    "Driving Eighths queued after a transition fill.",
  );

  const beatVisualizer = page.getByRole("region", {
    name: "Beat visualization",
  });
  await expect(beatVisualizer).toContainText("Measure 2", { timeout: 4_000 });
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Driving Eighths" }),
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByText("Queued after a transition fill", { exact: true }),
  ).toBeHidden();
  await expect(page.getByTestId("practice-live-region")).toHaveText(
    "Pattern changed to Driving Eighths.",
  );
  await page.getByRole("button", { name: "Stop playback" }).click();
  expect(browserErrors).toEqual([]);
});

test("resets playback after navigating from an active practice to another pattern", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  await page.getByText("Off", { exact: true }).click();
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );

  await page.getByRole("link", { exact: true, name: "Patterns" }).click();
  await page.getByRole("searchbox").fill("One Drop");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "One Drop" }) });
  await card.getByRole("button", { name: "Practice" }).click();

  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { name: "One Drop" })).toBeVisible();
  await expect(
    page.getByRole("button", { exact: true, name: "Play" }),
  ).toBeEnabled();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Audio waits for your first press",
  );
  expect(browserErrors).toEqual([]);
});
