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
  await page.getByRole("button", { name: "Add One Drop to favorites" }).click();
  await expect(
    page.getByRole("button", { name: "Remove One Drop from favorites" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await page.getByRole("searchbox").fill("One Drop");
  await expect(
    page.getByRole("button", { name: "Remove One Drop from favorites" }),
  ).toHaveAttribute("aria-pressed", "true");
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
  await expect(page.getByRole("heading", { name: "One Drop" })).toBeVisible();
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("76");

  await page.reload();
  await expect(page.getByRole("heading", { name: "One Drop" })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("queues a playing pattern change until the next measure", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
    { timeout: 8_000 },
  );

  await page
    .getByRole("combobox", { name: "Current pattern" })
    .selectOption("modern-pop-groove");
  await expect(
    page.getByText("Queued for the next measure", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Modern Pop Groove" }),
  ).toBeVisible({ timeout: 5_000 });
  expect(browserErrors).toEqual([]);
});

test("resets playback after navigating from an active practice to another pattern", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.goto("/practice");
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
    { timeout: 8_000 },
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
