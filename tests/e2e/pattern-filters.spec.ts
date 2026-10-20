import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`keeps pattern filters usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/patterns");
    const panel = page.getByRole("region", { name: "Pattern filters" });
    await expect(panel).toBeVisible();
    const cards = page.getByRole("article");
    const columns = width >= 1280 ? 3 : width >= 768 ? 2 : 1;
    const firstCard = await cards.first().boundingBox();
    const nextRow = await cards.nth(columns).boundingBox();
    expect(nextRow!.y).toBeGreaterThan(firstCard!.y);
    for (let index = 1; index < columns; index++) {
      const sibling = await cards.nth(index).boundingBox();
      expect(sibling!.y).toBe(firstCard!.y);
      expect(sibling!.height).toBe(firstCard!.height);
    }
    await expect(panel.getByRole("combobox")).toHaveCount(0);
    await panel.getByRole("button", { name: "Show filters" }).click();

    const controls = panel.getByRole("combobox");
    await expect(controls).toHaveCount(4);
    for (const control of await controls.all()) {
      const size = await control.boundingBox();
      expect(size).not.toBeNull();
      expect(size!.height).toBeGreaterThanOrEqual(44);
      expect(size!.x).toBeGreaterThanOrEqual(0);
      expect(size!.x + size!.width).toBeLessThanOrEqual(width);
    }

    await panel.getByRole("combobox", { name: "Genre" }).click();
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const menuBounds = await menu.boundingBox();
    expect(menuBounds!.x).toBeGreaterThanOrEqual(0);
    expect(menuBounds!.x + menuBounds!.width).toBeLessThanOrEqual(width);
    await page.getByRole("option", { name: "Reggae", exact: true }).click();
    await expect(
      page.getByText("4 patterns found", { exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByRole("combobox", { name: "Genre" }),
    ).toHaveAttribute("data-active");

    const search = panel.getByRole("searchbox", { name: "Search patterns" });
    await search.fill("One Drop");
    await expect(
      page.getByText("1 pattern found", { exact: true }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Clear search" }).click();
    await expect(search).toBeFocused();
    await expect(
      page.getByText("4 patterns found", { exact: true }),
    ).toBeVisible();

    await panel.getByRole("button", { name: "Hide filters" }).click();
    await expect(panel.getByRole("combobox")).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: "Show filters" }),
    ).toContainText("1");

    await panel.getByRole("button", { name: "Reset filters" }).click();
    await expect(page.getByText("44 patterns found")).toBeVisible();
    const overflow = await panel.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    );
    expect(overflow).toBe(false);
  });
}

test("selects a genre and dismisses menus using the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/patterns");
  await page.getByRole("button", { name: "Show filters" }).click();
  const genre = page.getByRole("combobox", { name: "Genre" });
  await genre.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(genre).toContainText("Rock");
  await expect(genre).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(genre).toBeFocused();
});

for (const theme of ["dark", "light"]) {
  test(`filters and open menus are accessible in ${theme} mode`, async ({
    page,
  }) => {
    await page.addInitScript((selectedTheme) => {
      localStorage.setItem(
        "web-band-appearance-v2",
        JSON.stringify({
          beatFlashIntensity: "standard",
          reducedMotion: false,
          theme: selectedTheme,
          visualSubdivisionDetail: "pattern",
        }),
      );
    }, theme);
    await page.goto("/patterns");
    const panel = page.getByRole("region", { name: "Pattern filters" });
    await expect(panel).toBeVisible();
    await panel.getByRole("button", { name: "Show filters" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator('[data-motion="page"]')).toHaveCSS(
      "opacity",
      "1",
    );

    const closedResults = await new AxeBuilder({ page })
      .include('[aria-label="Pattern filters"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(closedResults.violations).toEqual([]);

    await panel.getByRole("combobox", { name: "Genre" }).click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("listbox")).toHaveCSS("opacity", "1");
    const openResults = await new AxeBuilder({ page })
      .include('[data-slot="select-content"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(openResults.violations).toEqual([]);
  });
}
