import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const routes = [
  {
    path: "/practice",
    heading: "Practice room",
    label: "Loading your saved practice setup…",
  },
  {
    path: "/patterns",
    heading: "Find your pocket",
    label: "Loading your groove library",
  },
  {
    path: "/editor",
    heading: "Shape your groove",
    label: "Setting up the pattern workshop",
  },
  {
    path: "/history",
    heading: "Practice history",
    label: "Opening your practice journal",
  },
  { path: "/settings", heading: "Settings", label: "Opening settings" },
] as const;

// Hold the browser bundle, not a timer: the server-rendered dynamic fallback
// stays visible until each test explicitly releases it.
async function holdPageScripts(page: Page) {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/_next/static/**", async (route) => {
    if (route.request().resourceType() === "script") await ready;
    await route.continue();
  });
  return release;
}

test.beforeEach(({}, testInfo) => {
  test.skip(
    !["chromium", "mobile-chromium"].includes(testInfo.project.name),
    "Skeleton geometry and motion are covered in desktop and mobile Chromium.",
  );
});

for (const route of routes) {
  test(`${route.path} shows an accessible skeleton without blocking navigation`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const release = await holdPageScripts(page);
    try {
      await page.goto(route.path, { waitUntil: "commit" });
      const main = page.getByRole("main", { name: route.label });
      await expect(main).toBeVisible();
      await expect(main).toHaveAttribute("aria-busy", "true");
      await expect(
        main.locator('[data-slot="skeleton"]').first(),
      ).toBeVisible();
      await expect(
        page.getByRole("status").filter({ hasText: route.label }),
      ).toHaveClass("sr-only");
      await expect(
        page.getByRole("navigation", { name: "Primary navigation" }),
      ).toBeVisible();
      await expect(main.getByRole("button")).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: route.heading, exact: true }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);

      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
    } finally {
      release();
    }
    await expect(
      page.getByRole("heading", { name: route.heading, exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-slot="loading-skeleton"]')).toHaveCount(0);
  });
}

for (const preference of ["system", "app"] as const) {
  test(`${preference} reduced motion keeps light-theme skeletons static at 320px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({
      reducedMotion: preference === "system" ? "reduce" : "no-preference",
    });
    await page.addInitScript((reducedMotion) => {
      localStorage.setItem(
        "web-band-appearance-v2",
        JSON.stringify({
          theme: "light",
          reducedMotion,
          beatFlashIntensity: "standard",
          visualSubdivisionDetail: "pattern",
        }),
      );
    }, preference === "app");
    const release = await holdPageScripts(page);
    try {
      await page.goto("/patterns", { waitUntil: "commit" });
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      const placeholder = page.locator('[data-slot="skeleton"]').first();
      await expect(placeholder).toBeVisible();
      await expect(placeholder).toHaveCSS("animation-name", "none");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    } finally {
      release();
    }
    await expect(
      page.getByRole("heading", { name: "Find your pocket" }),
    ).toBeVisible();
  });
}
