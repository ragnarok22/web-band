import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const overflowing = await page.getByRole("main").evaluate((main) =>
    [...main.querySelectorAll<HTMLElement>("*")].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 &&
        (rect.left < -1 || rect.right > window.innerWidth + 1)
        ? [element.outerHTML.slice(0, 180)]
        : [];
    }),
  );
  expect(overflowing).toEqual([]);
}

for (const theme of ["dark", "light"] as const) {
  for (const width of [320, 768, 1280]) {
    test(`About is compact and responsive at ${width}px in ${theme} theme`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((theme) => {
        window.localStorage.setItem(
          "web-band-appearance-v2",
          JSON.stringify({ theme }),
        );
      }, theme);
      await page.goto("/about");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const heading = page.getByRole("heading", {
        level: 1,
        name: "Practice guitar. Find your rhythm.",
      });
      await expect(heading).toBeVisible();
      expect(
        await heading.evaluate((element) =>
          parseFloat(getComputedStyle(element).fontSize),
        ),
      ).toBeLessThanOrEqual(48);
      await expect(
        page.getByRole("link", { name: "Start Practicing" }).first(),
      ).toBeInViewport({ ratio: 1 });

      const features = page.getByRole("region", {
        name: "Everything you need to find your rhythm.",
      });
      const cards = features.getByRole("listitem");
      await expect(cards).toHaveCount(5);
      const tops = await cards.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().top),
      );
      const firstRowCount = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
      expect(tops.filter((top) => Math.abs(top - tops[0]) < 1)).toHaveLength(
        firstRowCount,
      );
      const steps = page
        .getByRole("region", { name: "From setup to practice in seconds." })
        .getByRole("listitem");
      await expect(steps).toHaveCount(3);
      const stepTops = await steps.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().top),
      );
      expect(new Set(stepTops).size).toBe(width >= 768 ? 1 : 3);
      await expectNoOverflow(page);

      // Check the collapsed state too; the shared accessibility audit expands it.
      if (width === 320) {
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      }
      const details = page.getByRole("button", { name: "How Web Band works" });
      await details.click();
      await expect(details).toHaveAttribute("aria-expanded", "true");
      await expect(
        page.getByRole("heading", { name: "Synthesized Drum Sounds" }),
      ).toBeVisible();
      await expectNoOverflow(page);
      await details.click();
      await expect(details).toHaveAttribute("aria-expanded", "false");
    });
  }
}

test("About actions navigate to practice, grooves, and backup settings", async ({
  page,
}) => {
  for (const [name, path, destination] of [
    ["Start Practicing", "/practice", "Practice room"],
    ["Explore Grooves", "/patterns", "Find your pocket"],
  ]) {
    for (const placement of ["hero", "footer"]) {
      await page.goto("/about");
      const links = page.getByRole("link", { name });
      await (placement === "hero" ? links.first() : links.last()).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(
        page.getByRole("heading", { level: 1, name: destination }),
      ).toBeVisible();
    }
  }
  await page.goto("/about");
  await page.getByRole("link", { name: "Manage backups in Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { name: "Backup & restore" }),
  ).toBeVisible();
});

test("technical details work from the keyboard with reduced motion", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "webkit",
    "WebKit link tabbing follows the host Full Keyboard Access setting.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about");
  await page.getByRole("link", { name: "Start Practicing" }).first().focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Explore Grooves" }).first(),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Manage backups in Settings" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  const details = page.getByRole("button", { name: "How Web Band works" });
  await expect(details).toBeFocused();
  expect(
    await details.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Space");
  await expect(details).toHaveAttribute("aria-expanded", "false");
  await expect(details).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Start Practicing" }).last(),
  ).toBeFocused();
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
});

test("opening About and its disclosure does not initialize browser audio", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let contextCount = 0;
    Object.defineProperty(window, "__aboutAudioContexts", {
      get: () => contextCount,
    });
    for (const name of ["AudioContext", "webkitAudioContext"] as const) {
      const Original = Reflect.get(window, name) as
        typeof AudioContext | undefined;
      if (!Original) continue;
      Reflect.set(
        window,
        name,
        new Proxy(Original, {
          construct(target, argumentsList, newTarget) {
            contextCount += 1;
            return Reflect.construct(target, argumentsList, newTarget);
          },
        }),
      );
    }
  });
  await page.goto("/about");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Practice guitar. Find your rhythm.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "How Web Band works" }).click();
  await expect(
    page.getByRole("heading", { name: "Accurate Musical Timing" }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Less reading. More playing." })
    .scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  expect(
    await page.evaluate(() => Reflect.get(window, "__aboutAudioContexts")),
  ).toBe(0);
});
