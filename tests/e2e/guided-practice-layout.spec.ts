import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { closeControls, openControls } from "./practice-helpers";

for (const width of [320, 390, 640, 1024, 1280, 1440, 1920]) {
  test(`practice workspace and Controls work at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 1000, width });
    await page.goto("/practice");
    const controls = page.getByRole("button", {
      name: "Controls",
      exact: true,
    });
    await expect(controls).toHaveAttribute("aria-expanded", "false");
    const workspace = page.getByRole("region", {
      name: "Practice session",
      exact: true,
    });
    const visualizer = page.getByRole("region", { name: "Beat visualization" });
    const originalWidth = (await visualizer.boundingBox())!.width;
    const modes = page.getByRole("radiogroup", { name: "Practice mode" });
    await expect(modes.getByRole("radio")).toHaveCount(4);
    await expect(
      page.getByRole("button", { name: "Metronome — Coming soon" }),
    ).toBeDisabled();
    for (const mode of ["Strumming", "Chords", "Tempo", "Drums"]) {
      await modes.getByText(mode, { exact: true }).click();
      await expect(
        modes.getByRole("radio", { name: mode, exact: true }),
      ).toBeChecked();
    }
    await openControls(page, "Groove Feel");
    await expect(
      page.getByRole("slider", { name: "Swing", exact: true }),
    ).toBeVisible();
    if (width >= 1024) {
      await expect(
        page.getByRole("complementary", { name: "Practice controls" }),
      ).toBeVisible();
      await expect
        .poll(async () => (await visualizer.boundingBox())!.width)
        .toBeLessThan(originalWidth - 300);
      await expect(
        page.getByRole("dialog", { name: "Practice controls" }),
      ).toHaveCount(0);
    } else {
      await expect(
        page.getByRole("dialog", { name: "Practice controls" }),
      ).toBeVisible();
    }
    await closeControls(page);
    await expect
      .poll(async () => (await visualizer.boundingBox())!.width)
      .toBe(originalWidth);
    await expect(
      workspace.getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}

test("persists desktop visibility but does not auto-open mobile Sheets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/practice");
  await openControls(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Controls", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Controls", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("mobile Sheets close on Escape without stopping active audio and restore focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/practice");
  await page
    .getByRole("radio", { name: "Off", exact: true })
    .locator("..")
    .click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );
  const trigger = page.getByRole("button", { name: "Controls", exact: true });
  await openControls(page);
  const dialog = page.getByRole("dialog", { name: "Practice controls" });
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );
  await expect.poll(() => page.locator(".beat-step--active").count()).toBe(1);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Groove playing",
  );
  await page.getByRole("button", { name: "Stop playback" }).click();
});

for (const theme of ["dark", "light"]) {
  test(`expanded Controls are accessible in ${theme} mode`, async ({
    page,
  }) => {
    await page.addInitScript(
      (theme) =>
        localStorage.setItem(
          "web-band-appearance-v2",
          JSON.stringify({
            theme,
            reducedMotion: true,
            beatFlashIntensity: "standard",
            visualSubdivisionDetail: "pattern",
          }),
        ),
      theme,
    );
    await page.goto("/practice");
    await openControls(page, "Groove Feel");
    await openControls(page, "Drum Kit");
    await openControls(page, "Advanced");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
