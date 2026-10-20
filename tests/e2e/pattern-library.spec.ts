import { expect, test, type Page } from "@playwright/test";
import { navigate } from "./practice-helpers";

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
  await expect(page.getByText("44 patterns found")).toBeVisible();
  await expect(page.getByText("Showing 12 of 44 patterns")).toBeVisible();

  const showFilters = page.getByRole("button", { name: "Show filters" });
  if (await showFilters.isVisible()) await showFilters.click();
  await page.getByRole("combobox", { name: "Genre" }).click();
  await page.getByRole("option", { name: "Reggae", exact: true }).click();
  await expect(
    page.getByText("4 patterns found", { exact: true }),
  ).toBeVisible();
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

test("browses every pattern in batches without overflow at 320px", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.setViewportSize({ height: 720, width: 320 });
  await page.goto("/patterns");
  await expect(
    page.getByRole("heading", { name: "Find your pocket" }),
  ).toBeVisible();

  const patterns = page.getByRole("region", { name: "Patterns" });
  await expect(patterns.getByRole("article")).toHaveCount(12);
  const rail = await patterns.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(rail.scrollWidth).toBeLessThanOrEqual(rail.clientWidth);
  for (const count of [24, 36, 44]) {
    const firstNewIndex = await patterns.getByRole("article").count();
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(patterns.getByRole("article")).toHaveCount(count);
    await expect(
      patterns.getByRole("article").nth(firstNewIndex),
    ).toBeFocused();
  }
  const names = await patterns.getByRole("heading").allTextContents();
  expect(new Set(names).size).toBe(44);
  await expect(page.getByText("Showing 44 of 44 patterns")).toBeVisible();
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(browserErrors).toEqual([]);
});

test("starts with foundations and preserves explicit alphabetical and recommended sorting", async ({
  page,
}) => {
  await page.goto("/patterns");
  const headings = page
    .getByRole("region", { name: "Patterns" })
    .getByRole("heading", { level: 2 });
  await expect(headings.nth(0)).toHaveText("Basic Rock");
  await expect(headings.nth(1)).toHaveText("Basic Pop");
  await expect(headings.nth(2)).toHaveText("Straight Blues");
  await page.getByRole("button", { name: "Load more" }).click();
  await page.getByRole("button", { name: "Show filters" }).click();
  const sort = page.getByRole("combobox", { name: "Sort order" });
  await expect(sort).toContainText("Recommended");
  await sort.click();
  await page.getByRole("option", { name: "Name", exact: true }).click();
  await expect(headings.first()).toHaveText("6/8 Rock Ballad");
  await expect(page.getByRole("article")).toHaveCount(12);
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(sort).toContainText("Recommended");
  await expect(headings.first()).toHaveText("Basic Rock");
  await page.getByRole("searchbox").fill("blues");
  await expect(headings.first()).toHaveText("Straight Blues");
});

test("library preview skips the saved count-in without changing practice settings", async ({
  page,
}) => {
  await page.goto("/practice");
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("4");
  await navigate(page, "Patterns");
  const card = page.getByRole("article", { name: "Basic Rock", exact: true });
  await card
    .getByRole("button", { name: "Basic Rock preview", exact: true })
    .click();
  await expect(card.getByText("Playing", { exact: true })).toBeVisible({
    timeout: 5000,
  });
  await expect(card.getByText("Count-in", { exact: true })).toHaveCount(0);
  await expect(
    card.locator('[data-rhythm-cell][data-active="true"]'),
  ).toHaveCount(3);
  await card.getByRole("button", { name: "Stop Basic Rock preview" }).click();
  await card.getByRole("button", { name: "Practice", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Count-in length" }),
  ).toHaveValue("4");
});

test("previews one groove at a time and stops before entering practice", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/patterns");
  const first = page.getByRole("article", { name: "Basic Rock", exact: true });
  await first.getByRole("button", { name: "Basic Rock preview" }).click();
  await expect(
    first.getByRole("button", { name: "Stop Basic Rock preview" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(first.getByText("Stop", { exact: true })).toBeVisible();
  await expect(first).toHaveAttribute("data-previewing", "true");
  await expect(
    first.locator('[data-rhythm-cell][data-active="true"]'),
  ).toHaveCount(3, { timeout: 10_000 });
  const second = page.getByRole("article", { name: "Basic Pop", exact: true });
  await second.getByRole("button", { name: "Basic Pop preview" }).click();
  await expect(
    second.getByRole("button", { name: "Stop Basic Pop preview" }),
  ).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
  await expect(
    first.getByRole("button", { name: "Basic Rock preview" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: /preview$/, pressed: true }),
  ).toHaveCount(1);
  await expect(
    first.locator('[data-rhythm-cell][data-active="true"]'),
  ).toHaveCount(0);
  await expect(
    second.locator('[data-rhythm-cell][data-active="true"]'),
  ).toHaveCount(3);
  await second.getByRole("button", { name: "Stop Basic Pop preview" }).click();
  await expect(
    page.getByRole("button", { name: /preview$/, pressed: true }),
  ).toHaveCount(0);
  await expect(
    second.locator('[data-rhythm-cell][data-active="true"]'),
  ).toHaveCount(0);
  await second.getByRole("button", { name: "Practice", exact: true }).click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { name: "Basic Pop" })).toBeVisible();
  await expect(page.getByTestId("transport-status")).toHaveText("Ready");
  expect(browserErrors).toEqual([]);
});

test("combines quick filters, advanced filters, sorting, and reset across the whole library", async ({
  page,
}) => {
  await page.goto("/patterns");
  await page.getByRole("button", { name: "Load more" }).click();
  await page.getByRole("button", { name: "Show filters" }).click();
  await page.getByRole("combobox", { name: "Sort order" }).click();
  await page.getByRole("option", { name: "Default BPM", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(12);
  await expect(
    page
      .getByRole("article")
      .first()
      .getByRole("button", { name: "Default tempo: 58 BPM" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Beginner", exact: true }).click();
  await page.getByRole("combobox", { name: "Genre" }).click();
  await page.getByRole("option", { name: "Reggae", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "One Drop", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: "Quick filters" })
      .getByRole("button", { pressed: true }),
  ).toHaveCount(1);
  await page.getByRole("searchbox").fill("no matching groove");
  await expect(
    page.getByRole("heading", { name: "No grooves found." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .last()
    .click();
  await expect(page.getByText("Showing 12 of 44 patterns")).toBeVisible();
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(
    page.getByText(/Save patterns with the heart icon/),
  ).toBeVisible();
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

test("opens card actions, details, and terminology help using the keyboard", async ({
  page,
}) => {
  await page.goto("/patterns");
  await page.getByRole("searchbox").fill("Basic Rock");
  const card = page.getByRole("article", { name: "Basic Rock", exact: true });
  const more = card.getByRole("button", {
    name: "More actions for Basic Rock",
  });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menuitem", { name: "Duplicate Basic Rock" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  const details = card.getByRole("button", { name: "Basic Rock Details" });
  await details.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("aria-expanded", "true");
  await expect(card.getByText("70-130 BPM")).toBeVisible();
  await card.getByRole("button", { name: "Default tempo: 90 BPM" }).focus();
  await expect(page.getByRole("tooltip")).toContainText(
    "BPM means beats per minute.",
  );
  await expect(
    card.getByRole("button", { name: "Default tempo: 90 BPM" }),
  ).toHaveAccessibleDescription(/BPM means beats per minute/);
});

test("opens terminology help with a touch interaction", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Touch interaction is verified in mobile Chromium.");
  await page.goto("/patterns");
  await page.getByRole("searchbox").fill("Basic Rock");
  const tempo = page.getByRole("button", { name: "Default tempo: 90 BPM" });
  await tempo.tap();
  await expect(page.getByRole("tooltip")).toContainText(
    "BPM means beats per minute.",
  );
  await tempo.tap();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("navigates patterns by keyboard and commits active changes on a boundary", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  const bpmInput = page.getByRole("spinbutton", { name: "Current BPM" });

  await page.getByText("Practice room", { exact: true }).click();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("heading", { name: "Driving Eighths" }),
  ).toBeVisible();

  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();

  await bpmInput.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(bpmInput).toBeFocused();
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();

  await bpmInput.fill("220");
  await page.keyboard.press("Enter");
  await expect(bpmInput).toHaveValue("220");
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");

  await page.getByText("Practice room", { exact: true }).click();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("region", { name: "Current groove" }),
  ).toContainText("Driving Eighths");
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
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");

  await navigate(page, "Patterns");
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
  await expect(page.getByTestId("transport-status")).toHaveText("Ready");
  expect(browserErrors).toEqual([]);
});
