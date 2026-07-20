import { expect, test, type Page } from "@playwright/test";

async function seedAppearance(page: Page, reducedMotion: boolean) {
  await page.addInitScript((reduce) => {
    window.localStorage.setItem(
      "web-band-appearance-v2",
      JSON.stringify({
        beatFlashIntensity: "standard",
        reducedMotion: reduce,
        theme: "dark",
        visualSubdivisionDetail: "pattern",
      }),
    );
  }, reducedMotion);
}

async function expectNoRunningAnimations(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running").length,
      ),
    )
    .toBe(0);
}

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "Reduced-motion integration is covered in desktop Chromium.",
  );
});

test("system reduced motion disables page, panel, and focus transitions", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAppearance(page, false);
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await expect(page.locator('[data-motion="page"]')).toHaveAttribute(
    "data-motion-reduced",
    "true",
  );

  await page.getByRole("radio", { name: /Tempo/ }).locator("..").click();
  await expect(page.locator('[data-motion="guided-panel"]')).toHaveAttribute(
    "data-motion-reduced",
    "true",
  );
  await page.getByRole("button", { name: "Focus" }).click();
  await expect(page.locator('[data-motion="focus"]')).toHaveAttribute(
    "data-motion-reduced",
    "true",
  );
  await expectNoRunningAnimations(page);
});

test("the saved app preference disables motion without an OS preference", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedAppearance(page, true);
  await page.goto("/patterns");
  await expect(
    page.getByRole("heading", { name: "Find your pocket" }),
  ).toBeVisible();
  await expect(page.locator('[data-motion="page"]')).toHaveAttribute(
    "data-motion-reduced",
    "true",
  );
  await expectNoRunningAnimations(page);
});
