import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";

async function expectReadableCards(panel: Locator) {
  const cards = panel
    .locator("label")
    .filter({ has: panel.page().getByRole("radio") });
  await expect(cards).toHaveCount(4);

  for (const card of await cards.all()) {
    const geometry = await card.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const text = Array.from(element.querySelectorAll("span")).filter(
        (span) => span.childElementCount === 0 && span.textContent?.trim(),
      );
      return {
        height: bounds.height,
        textFits: text.every((span) => {
          const rect = span.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.left >= bounds.left &&
            rect.right <= bounds.right &&
            rect.bottom <= bounds.bottom &&
            span.scrollWidth <= span.clientWidth
          );
        }),
        width: bounds.width,
      };
    });
    expect(geometry.textFits).toBe(true);
    expect(geometry.width).toBeGreaterThanOrEqual(44);
    expect(geometry.height).toBeGreaterThanOrEqual(44);
  }
}

for (const width of [320, 640, 1024, 1280, 1440]) {
  test(`keeps guided practice readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/practice");
    const panel = page.getByRole("region", {
      exact: true,
      name: "Guided practice",
    });
    await expect(panel).toBeVisible();
    if (width < 640) {
      await panel
        .getByRole("button", { name: "Show guided practice settings" })
        .click();
    }

    await expectReadableCards(panel);
    const heading = panel.getByRole("heading", { name: "Guided practice" });
    const singleLineHeading = await heading.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length === 1;
    });
    expect(singleLineHeading).toBe(true);

    const heights = await panel
      .locator("label")
      .evaluateAll((cards) =>
        cards.map((card) => card.getBoundingClientRect().height),
      );
    expect(heights[0]).toBe(heights[1]);
    expect(heights[2]).toBe(heights[3]);

    await panel.getByText("Build speed in measured steps.").click();
    await expect(
      panel.getByRole("radio", { name: "Tempo", exact: true }),
    ).toBeChecked();
    await expect(
      panel.getByRole("heading", { name: "Tempo trainer" }),
    ).toBeVisible();

    const overflow = await panel.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    );
    expect(overflow).toBe(false);
  });
}

test("uses a single column when the panel is narrow, even on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto("/practice");
  const panel = page.getByRole("region", {
    exact: true,
    name: "Guided practice",
  });
  await expect(panel).toBeVisible();
  await panel.evaluate((element) => {
    element.style.maxWidth = "256px";
  });

  const choices = panel.getByRole("radiogroup", { name: "Practice mode" });
  await expect
    .poll(() =>
      choices.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      ),
    )
    .toBe(1);
  await expectReadableCards(panel);
});

for (const theme of ["dark", "light"]) {
  test(`expanded guided practice is accessible in ${theme} mode`, async ({
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
    await page.goto("/practice");
    const panel = page.getByRole("region", {
      exact: true,
      name: "Guided practice",
    });
    await expect(panel).toBeVisible();
    if ((page.viewportSize()?.width ?? 1280) < 640) {
      await panel
        .getByRole("button", { name: "Show guided practice settings" })
        .click();
    }
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    // Audit the settled colors, not a partially transparent entry animation.
    await expect(page.locator('[data-motion="page"]')).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(panel.locator('[data-motion="guided-panel"]')).toHaveCSS(
      "opacity",
      "1",
    );

    const results = await new AxeBuilder({ page })
      .include('[aria-labelledby="guided-practice-heading"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
