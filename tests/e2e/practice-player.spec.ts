import { expect, test, type Page } from "@playwright/test";
import { closeControls, openControls } from "./practice-helpers";

async function expectNoOverflow(page: Page) {
  expect(
    await page.evaluate(() => {
      const player = document.querySelector<HTMLElement>(
        '[aria-label="Practice player"]',
      )!;
      return (
        document.documentElement.scrollWidth <=
          document.documentElement.clientWidth &&
        player.scrollWidth <= player.clientWidth
      );
    }),
  ).toBe(true);
}

test("keeps primary transport controls centered between tempo and playback status", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto("/practice");
  const player = page.getByRole("region", {
    name: "Practice player",
    exact: true,
  });
  for (const width of [1920, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const open of [false, true]) {
      if (open) await openControls(page);
      const playerBox = (await player.boundingBox())!;
      const play = (await player
        .getByRole("button", { name: "Play", exact: true })
        .boundingBox())!;
      const tempo = (await player
        .getByRole("region", { name: "Set your pace" })
        .boundingBox())!;
      const status = (await player
        .getByTestId("transport-status")
        .boundingBox())!;
      expect(
        Math.abs(play.x + play.width / 2 - (playerBox.x + playerBox.width / 2)),
      ).toBeLessThanOrEqual(1);
      expect(tempo.x + tempo.width).toBeLessThan(play.x);
      expect(status.x).toBeGreaterThan(play.x + play.width);
      expect(
        Math.abs(status.y + status.height / 2 - (play.y + play.height / 2)),
      ).toBeLessThanOrEqual(2);
      await expectNoOverflow(page);
      if (open) await closeControls(page);
    }
  }
});

test("makes beats and grouped subdivisions readable without stretching across wide screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto("/practice");
  const visualizer = page.getByRole("region", { name: "Beat visualization" });
  await expect(visualizer.locator(".beat-step--main")).toHaveCount(4);
  expect(
    (await visualizer.locator(".beat-visualizer__grid").boundingBox())!.width,
  ).toBeLessThanOrEqual(896);
  const group = visualizer.locator('.beat-visualizer__group[data-beat="1"]');
  const main = group.locator(".beat-step--main .beat-step__light");
  const subdivision = group
    .locator(".beat-step:not(.beat-step--main) .beat-step__light")
    .first();
  expect((await main.boundingBox())!.width).toBeGreaterThanOrEqual(32);
  expect((await subdivision.boundingBox())!.width).toBeGreaterThanOrEqual(8);
  expect((await group.boundingBox())!.width).toBeLessThanOrEqual(96);
  const downbeat = await main.evaluate((element) => ({
    border: getComputedStyle(element).borderWidth,
    marker: getComputedStyle(element, "::after").content,
  }));
  expect(downbeat.border).toBe("2px");
  expect(downbeat.marker).not.toBe("none");
  expect(
    await subdivision.evaluate((element) =>
      Number(getComputedStyle(element).opacity),
    ),
  ).toBeGreaterThanOrEqual(0.8);
});

test("retains a clear active beat without scaling when reduced motion is enabled", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/practice");
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const visualizer = page.getByRole("region", { name: "Beat visualization" });
  await expect(visualizer).toHaveAttribute("data-motion-reduced", "true");
  const active = visualizer.locator(".beat-step--active .beat-step__light");
  await expect(active).toHaveCount(1);
  await expect(active).toHaveCSS("transform", "none");
  await page.getByRole("button", { name: "Stop playback" }).click();
});

test("shows explanatory tooltips on hover and keyboard focus without interrupting playback", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-chromium",
    "Tooltips are deliberately disabled for touch input.",
  );
  await page.goto("/practice");
  const tempoOptions = page.getByRole("button", {
    name: "More tempo controls",
  });
  await tempoOptions.hover();
  await expect(
    page.getByText("More tempo options", { exact: true }),
  ).toBeVisible();
  await tempoOptions.click();
  await expect(
    page.getByRole("slider", { name: "Tempo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Focus", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Open Shortcuts" }),
  ).toBeFocused();
  await expect(
    page.getByText("Keyboard shortcuts (?)", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  await tempoOptions.hover();
  await expect(
    page.getByText("More tempo options", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  await page.getByRole("button", { name: "Stop playback" }).click();
});

test("keeps the groove and unified player above the fold with Controls open or closed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 768 });
  await page.goto("/practice");
  const player = page.getByRole("region", {
    name: "Practice player",
    exact: true,
  });
  const groove = page.getByRole("region", { name: "Current groove" });
  await expect(
    player.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  expect((await groove.boundingBox())!.height).toBeLessThanOrEqual(110);
  expect(await page.getByRole("note").count()).toBe(0);
  await expect(page.getByText("Ready", { exact: true })).toHaveCount(1);
  for (const open of [false, true]) {
    if (open) await openControls(page);
    const box = (await player.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(768);
    await expectNoOverflow(page);
  }
});

test("wraps every guided mode and advanced tempo controls without overflow at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/practice");
  const player = page.getByRole("region", {
    name: "Practice player",
    exact: true,
  });
  for (const mode of ["Drums", "Strumming", "Chords", "Tempo"]) {
    await page
      .getByRole("radio", { name: mode, exact: true })
      .locator("..")
      .click();
    await expect(
      player.getByRole("region", { name: "Beat visualization" }),
    ).toBeVisible();
    await expectNoOverflow(page);
  }
  await page
    .getByRole("radio", { name: "Drums", exact: true })
    .locator("..")
    .click();
  await player.getByRole("button", { name: "More tempo controls" }).click();
  await expect(
    player.getByRole("slider", { name: "Tempo", exact: true }),
  ).toBeVisible();
  await expectNoOverflow(page);
  await player.getByRole("button", { name: "More tempo controls" }).click();
  await page.getByRole("button", { name: "Change Pattern" }).click();
  await page
    .getByRole("combobox", { name: "Current pattern" })
    .fill("Basic Jazz Ride Practice");
  await page
    .getByRole("option", {
      name: "Basic Jazz Ride Practice - 12/8",
      exact: true,
    })
    .click();
  await expect(player.locator(".beat-visualizer__group")).toHaveCount(12);
  await expectNoOverflow(page);
});

test("preserves active audio through player tools, Controls, and Focus, then finishes gracefully", async ({
  page,
}) => {
  await page.goto("/practice");
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page.getByRole("spinbutton", { name: "Current BPM" }).fill("220");
  await page.getByRole("spinbutton", { name: "Current BPM" }).press("Enter");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const status = page.getByTestId("transport-status");
  await expect(status).toHaveText("Playing");
  await page.getByRole("button", { name: "More tempo controls" }).click();
  await expect(status).toHaveText("Playing");
  await page.getByRole("button", { name: "Open Shortcuts" }).click();
  await page.keyboard.press("Escape");
  await expect(status).toHaveText("Playing");
  await openControls(page);
  await closeControls(page);
  await expect(status).toHaveText("Playing");
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await page.getByRole("button", { name: "Exit focus" }).click();
  await expect(status).toHaveText("Playing");
  await expect(page.locator(".beat-step--active")).toHaveCount(1);
  await page.getByRole("button", { name: "Finish with fill" }).click();
  await expect(
    page.getByRole("button", { name: "Finishing after fill" }),
  ).toBeDisabled();
  await expect(status).toHaveText("Stopped", { timeout: 7000 });
  await expect(page.locator(".beat-step--active")).toHaveCount(0);
});
