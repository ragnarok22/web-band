import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const auditProjects = new Set(["chromium", "mobile-chromium"]);
const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const routes = [
  { heading: "Basic Rock", path: "/practice" },
  { heading: "Find your pocket", path: "/patterns" },
  { heading: "Shape your groove", path: "/editor" },
  { heading: "The work you put in.", path: "/history" },
  { heading: "Settings, kept simple.", path: "/settings" },
  { heading: "A drum room without the room.", path: "/about" },
] as const;
const themes = ["dark", "light"] as const;

test.describe.configure({ mode: "serial" });

async function seedTheme(page: Page, theme: (typeof themes)[number]) {
  await page.addInitScript((selectedTheme) => {
    window.localStorage.setItem(
      "web-band-appearance-v2",
      JSON.stringify({
        beatFlashIntensity: "standard",
        reducedMotion: false,
        theme: selectedTheme,
        visualSubdivisionDetail: "pattern",
      }),
    );
  }, theme);
}

function skipNonAuditBrowser(testInfo: TestInfo): void {
  test.skip(
    !auditProjects.has(testInfo.project.name),
    "Axe and target geometry run in desktop and mobile Chromium.",
  );
}

async function expectNamedRouteControls(page: Page, path: string) {
  if (path === "/practice") {
    await expect(
      page.getByRole("complementary", { name: "Pattern and mixer" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { exact: true, name: "Play" }),
    ).toBeVisible();
    await expect(page.getByRole("slider", { name: "Tempo" })).toBeVisible();
  } else if (path === "/patterns") {
    await expect(
      page.getByRole("searchbox", { name: "Search patterns" }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Patterns" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Basic Rock favorite" }),
    ).toHaveAttribute("aria-pressed", "false");
  } else if (path === "/editor") {
    await expect(
      page.getByRole("textbox", { name: "Pattern name" }),
    ).toBeVisible();
    await expect(
      page.getByRole("grid", { name: "Drum pattern steps" }),
    ).toBeVisible();
  } else if (path === "/history") {
    await expect(
      page.getByRole("heading", { name: "No sessions yet" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start practicing" }),
    ).toBeVisible();
  } else if (path === "/settings") {
    await expect(
      page.getByRole("combobox", { name: "Color theme" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Reduce motion" }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("img", {
        name: "A sixteen-step rhythm with accented beats",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start practicing" }),
    ).toBeVisible();
  }
}

async function findUndersizedTargets(page: Page) {
  const targets = page.locator(
    [
      'nav[aria-label="Primary navigation"] a[href]',
      "#main-content button",
      "#main-content a[href]",
      "#main-content select",
      '#main-content label:has(input[type="checkbox"])',
      '#main-content label:has(input[type="radio"])',
    ].join(", "),
  );

  return targets.evaluateAll((elements) =>
    elements.flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        rect.width === 0 ||
        rect.height === 0 ||
        (rect.width >= 44 && rect.height >= 44)
      ) {
        return [];
      }
      return [
        {
          height: Math.round(rect.height * 10) / 10,
          label:
            element.getAttribute("aria-label") ??
            element.textContent?.trim().replace(/\s+/g, " ") ??
            element.tagName,
          width: Math.round(rect.width * 10) / 10,
        },
      ];
    }),
  );
}

for (const theme of themes) {
  for (const route of routes) {
    test(`${theme} ${route.path} has accessible semantics, contrast, and targets`, async ({
      page,
    }, testInfo) => {
      skipNonAuditBrowser(testInfo);
      await seedTheme(page, theme);
      await page.goto(route.path);
      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(
        page.getByRole("navigation", { name: "Primary navigation" }),
      ).toBeVisible();
      await expectNamedRouteControls(page, route.path);

      const semantics = await new AxeBuilder({ page })
        .withTags(axeTags)
        .disableRules(["color-contrast"])
        .analyze();
      expect(
        semantics.violations,
        `${theme} ${route.path} semantic violations`,
      ).toEqual([]);

      for (const background of ["--background", "--background-deep"]) {
        await page.addStyleTag({
          content: `body { background: var(${background}) !important; }`,
        });
        const contrast = await new AxeBuilder({ page })
          .withRules(["color-contrast"])
          .analyze();
        expect(
          contrast.violations,
          `${theme} ${route.path} contrast against ${background}`,
        ).toEqual([]);
      }

      expect(
        await findUndersizedTargets(page),
        `${route.path} undersized targets`,
      ).toEqual([]);
    });
  }
}

test("skip navigation and primary navigation work from the keyboard", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "webkit",
    "WebKit link tabbing follows the host system's Full Keyboard Access setting.",
  );
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.getByRole("link", { exact: true, name: "Practice" }).focus();
  await expect(
    page.getByRole("link", { exact: true, name: "Practice" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { exact: true, name: "Patterns" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/patterns$/);
});

test("native dialog has a name, traps focus, and restores its trigger", async ({
  page,
}) => {
  await page.goto("/settings");
  const trigger = page.getByRole("button", { name: "Delete all local data" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Delete all local data?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await expect(
    dialog.getByRole("button", { name: "Delete local data" }),
  ).toBeDisabled();

  const results = await new AxeBuilder({ page })
    .include("dialog[open]")
    .analyze();
  expect(results.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("editor grid supports roving keyboard focus and named state", async ({
  page,
}) => {
  await page.goto("/editor");
  const grid = page.getByRole("grid", { name: "Drum pattern steps" });
  const first = grid.getByRole("button", {
    name: /^Crash, measure 1, column 1,/,
  });
  const second = grid.getByRole("button", {
    name: /^Crash, measure 1, column 2,/,
  });
  await page.getByRole("button", { name: "Clear Crash row" }).focus();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(second).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(second).toHaveAccessibleName(/70 percent velocity/);
  await page.keyboard.press("End");
  await expect(
    grid.getByRole("button", { name: /^Crash, measure 1, column 16,/ }),
  ).toBeFocused();
});

test("focus mode moves and restores focus without exposing navigation", async ({
  page,
}) => {
  await page.goto("/practice");
  const trigger = page.getByRole("button", { name: "Focus" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Focus session")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeFocused();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toHaveCount(0);
  await page.keyboard.press("f");
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeFocused();
});
