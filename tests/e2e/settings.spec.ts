import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const axeTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const auditProjects = new Set(["chromium", "mobile-chromium"]);

for (const theme of ["dark", "light"] as const) {
  for (const width of [320, 768, 1280]) {
    test(`${theme} settings fit ${width}px with appropriately sized controls`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/settings");
      await expect(
        page.getByRole("heading", { name: "Settings", exact: true }),
      ).toBeVisible();
      await page.getByRole("combobox", { name: "Color theme" }).click();
      await page
        .getByRole("option", {
          name: theme === "dark" ? "Dark" : "Light",
          exact: true,
        })
        .click();
      await expect(page.getByRole("listbox")).toHaveCount(0);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const appearance = await page
        .getByRole("region", { name: "Appearance" })
        .boundingBox();
      const practice = await page
        .getByRole("region", { name: "Practice", exact: true })
        .boundingBox();
      expect(appearance).not.toBeNull();
      expect(practice).not.toBeNull();
      if (width >= 768) {
        expect(practice!.x).toBeGreaterThan(appearance!.x + appearance!.width);
        expect(practice!.y).toBe(appearance!.y);
      } else {
        expect(practice!.x).toBe(appearance!.x);
        expect(practice!.y).toBeGreaterThan(appearance!.y + appearance!.height);
      }

      const overflow = await page
        .getByRole("main")
        .locator(
          "section, button, input:not([type=hidden]):not([aria-hidden=true]), [role=switch]",
        )
        .evaluateAll((elements) =>
          elements.flatMap((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 &&
              (rect.left < 0 || rect.right > window.innerWidth + 1)
              ? [element.outerHTML]
              : [];
          }),
        );
      expect(overflow).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
      const duration = await page
        .getByRole("spinbutton", { name: "Minimum session duration" })
        .boundingBox();
      expect(duration!.width).toBeLessThanOrEqual(112);
      expect(duration!.height).toBeGreaterThanOrEqual(44);

      // Match accessibility.spec.ts: Axe audits run in Chromium; layout and keyboard
      // coverage still run in every engine. Other engines expose library focus guards to Axe.
      if (width === 320 && auditProjects.has(testInfo.project.name)) {
        const audit = await new AxeBuilder({ page })
          .withTags(axeTags)
          .analyze();
        expect(audit.violations).toEqual([]);
        await page
          .getByRole("combobox", { name: "Visual subdivision detail" })
          .click();
        await expect(
          page.getByRole("option", { name: "All sixteenths" }),
        ).toBeVisible();
        await expect(
          page.getByRole("listbox", { name: "Visual subdivision detail" }),
        ).toBeVisible();
        // Audit the final colors, not intermediate opacity during the popup fade-in.
        await page
          .locator('[data-slot="select-content"][data-open]')
          .evaluate(async (element) => {
            await Promise.all(
              element.getAnimations().map((animation) => animation.finished),
            );
          });
        const openAudit = await new AxeBuilder({ page })
          .withTags(axeTags)
          .analyze();
        expect(openAudit.violations).toEqual([]);
        await page.keyboard.press("Escape");
      }
    });
  }
}

test("settings controls work from the keyboard and survive reload", async ({
  page,
}) => {
  await page.goto("/settings");
  const theme = page.getByRole("combobox", { name: "Color theme" });
  await theme.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("option", { name: "Light", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Light", exact: true }),
  ).toHaveAttribute("data-highlighted", "");
  await page.keyboard.press("Enter");
  await expect(theme).toContainText("Light");
  await expect(theme).toBeFocused();
  await page.keyboard.press("Tab");
  const motion = page.getByRole("switch", { name: "Reduce motion" });
  await expect(motion).toBeFocused();
  await page.keyboard.press("Space");
  await expect(motion).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduce-motion",
    "true",
  );

  const volume = page.getByRole("slider", { name: "Master volume" });
  await volume.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(volume).toHaveAttribute("aria-valuetext", "79 percent");
  await page.getByRole("combobox", { name: "Drum sound character" }).click();
  await page.getByRole("option", { name: "Soft", exact: true }).click();
  const duration = page.getByRole("spinbutton", {
    name: "Minimum session duration",
  });
  await duration.fill("45");
  const history = page.getByRole("switch", { name: "Save practice history" });
  await history.uncheck();
  await expect(duration).toBeDisabled();
  await expect(duration).toHaveValue("45");
  await page.reload();
  await expect(theme).toContainText("Light");
  await expect(motion).toBeChecked();
  await expect(volume).toHaveAttribute("aria-valuetext", "79 percent");
  await expect(
    page.getByRole("combobox", { name: "Drum sound character" }),
  ).toContainText("Soft");
  await expect(history).not.toBeChecked();
  await expect(duration).toBeDisabled();
  await expect(duration).toHaveValue("45");
  await history.check();
  await expect(duration).toBeEnabled();
});
