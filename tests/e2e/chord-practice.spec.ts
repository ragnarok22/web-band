import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

function player(page: Page) {
  return page.getByRole("region", { name: "Practice player", exact: true });
}

function timeline(page: Page) {
  return page.getByRole("region", {
    name: "Chord progression timeline",
    exact: true,
  });
}

async function openChords(page: Page) {
  await page.goto("/practice");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("radio", { name: "Chords", exact: true })
    .locator("..")
    .click();
  await expect(
    player(page).getByRole("combobox", { name: "Progression", exact: true }),
  ).toBeEnabled();
}

async function action(page: Page, name: string) {
  await player(page)
    .getByRole("button", { name: "Progression actions", exact: true })
    .click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

async function createProgression(
  page: Page,
  name: string,
  steps: Array<{ chord: string; duration: number; unit: "beats" | "measures" }>,
) {
  await action(page, "New progression");
  const editor = page.getByRole("dialog", {
    name: "Create progression",
    exact: true,
  });
  await editor
    .getByRole("textbox", { name: "Progression name", exact: true })
    .fill(name);
  for (const [index, step] of steps.entries()) {
    if (index > 0)
      await editor
        .getByRole("button", { name: "Add chord", exact: true })
        .click();
    await editor
      .getByRole("textbox", { name: `Chord ${index + 1}`, exact: true })
      .fill(step.chord);
    await editor
      .getByRole("spinbutton", {
        name: `Duration for chord ${index + 1}`,
        exact: true,
      })
      .fill(String(step.duration));
    await editor
      .getByRole("combobox", {
        name: `Duration unit for chord ${index + 1}`,
        exact: true,
      })
      .selectOption(step.unit);
  }
  await editor
    .getByRole("button", { name: "Save progression", exact: true })
    .click();
  await expect(editor).toBeHidden();
  await expect(
    player(page).getByRole("button", { name: "Progression actions" }),
  ).toBeFocused();
}

async function setPace(page: Page, bpm = 160) {
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  const input = page.getByRole("spinbutton", { name: "Current BPM" });
  await input.fill(String(bpm));
  await input.press("Enter");
}

async function expectNoOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = document.documentElement;
        const player = document.querySelector('[aria-label="Practice player"]');
        return (
          root.scrollWidth <= root.clientWidth + 1 &&
          (!player || player.scrollWidth <= player.clientWidth + 1)
        );
      }),
    )
    .toBe(true);
}

test("unifies selection and guidance while keeping drum accompaniment independent", async ({
  page,
}) => {
  await openChords(page);
  const accompaniment = page.getByRole("region", {
    name: "Drum accompaniment",
    exact: true,
  });
  await expect(
    accompaniment.getByRole("heading", { name: "Basic Rock", exact: true }),
  ).toBeVisible();
  await expect(
    accompaniment.getByRole("button", { name: "Change Groove", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Chord trainer", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("list", { name: "Chord progression", exact: true }),
  ).toHaveCount(1);
  await player(page)
    .getByRole("combobox", { name: "Progression", exact: true })
    .selectOption("c-g-am-f");
  await expect(player(page).getByTestId("current-chord")).toHaveText("C");
  await expect(
    player(page).getByRole("group", { name: "Next chord", exact: true }),
  ).toContainText("G");
  await expect(
    accompaniment.getByRole("heading", { name: "Basic Rock", exact: true }),
  ).toBeVisible();
  await expect(timeline(page).locator("li")).toHaveText([
    /C.*1 bar.*Current/s,
    /G.*1 bar.*Next/s,
    /Am.*1 bar/s,
    /F.*1 bar/s,
  ]);
});

test("copies, edits, favorites, persists, and confirms deletion of custom progressions", async ({
  page,
}) => {
  await openChords(page);
  await player(page)
    .getByRole("button", { name: "Progression actions" })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Edit progression", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("menuitem", { name: "Delete progression", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("menuitem", { name: "Copy built-in", exact: true })
    .click();
  const select = player(page).getByRole("combobox", {
    name: "Progression",
    exact: true,
  });
  await expect(select.locator("option:checked")).toHaveText(
    "G - D - Em - C copy",
  );
  await action(page, "Edit progression");
  const editor = page.getByRole("dialog", {
    name: "Edit progression",
    exact: true,
  });
  await editor
    .getByRole("textbox", { name: "Progression name", exact: true })
    .fill("My chord changes");
  await editor.getByRole("button", { name: "Move D up", exact: true }).click();
  await editor
    .getByRole("button", { name: "Save progression", exact: true })
    .click();
  await expect(editor).toBeHidden();
  await expect(player(page).getByTestId("current-chord")).toHaveText("D");
  const favorite = player(page).getByRole("button", {
    name: "My chord changes favorite",
    exact: true,
  });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(select.locator("option:checked")).toHaveText("My chord changes");
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await expect(
    select.locator('optgroup[label="Favorite progressions"] option'),
  ).toHaveText(["My chord changes"]);
  await action(page, "Delete progression");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    player(page).getByRole("button", { name: "Progression actions" }),
  ).toBeFocused();
  await action(page, "Delete progression");
  await page
    .getByRole("button", {
      name: "Delete My chord changes permanently",
      exact: true,
    })
    .click();
  await expect(select).toHaveValue("g-d-em-c");
  await expect(select).toBeFocused();
  await expect(
    select.getByRole("option", { name: "My chord changes", exact: true }),
  ).toHaveCount(0);
});

test("creates mixed durations and preserves countdown and repeat preferences", async ({
  page,
}) => {
  await openChords(page);
  await createProgression(page, "Mixed changes", [
    { chord: "Am", duration: 1, unit: "beats" },
    { chord: "F", duration: 2, unit: "beats" },
    { chord: "C", duration: 1, unit: "measures" },
    { chord: "G", duration: 2, unit: "measures" },
  ]);
  const durations = timeline(page).locator("li");
  await expect(durations).toHaveText([
    /Am.*1 beat/s,
    /F.*2 beats/s,
    /C.*1 bar/s,
    /G.*2 bars/s,
  ]);
  await expect(
    player(page).getByText("Change in 1 beat", { exact: true }),
  ).toBeVisible();
  await player(page)
    .getByRole("checkbox", { name: "Show change countdown", exact: true })
    .uncheck();
  await player(page)
    .getByRole("checkbox", { name: "Repeat progression", exact: true })
    .uncheck();
  await expect(
    player(page).getByRole("progressbar", { name: "Current chord progress" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    player(page).getByRole("checkbox", {
      name: "Show change countdown",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    player(page).getByRole("checkbox", {
      name: "Repeat progression",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(
    player(page).getByRole("progressbar", { name: "Current chord progress" }),
  ).toHaveCount(0);
});

test("keeps countdown, active chord, next chord, pause/resume, and Focus on the same playback", async ({
  page,
}) => {
  await openChords(page);
  await setPace(page, 100);
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  const status = page.getByTestId("transport-status");
  await expect(status).toHaveText("Playing");
  await expect(
    player(page).getByRole("combobox", { name: "Progression", exact: true }),
  ).toBeDisabled();
  await expect(
    player(page).getByRole("button", { name: "Progression actions" }),
  ).toBeDisabled();
  await expect
    .poll(() =>
      player(page).evaluate((element) => {
        const active = element.querySelector('li[aria-current="step"]');
        const current = element.querySelector(
          '[data-testid="current-chord"]',
        )?.textContent;
        const next = element
          .querySelector('li[data-state="next"]')
          ?.getAttribute("data-chord");
        const nextCue = element.querySelector(
          '[aria-label="Next chord"]',
        )?.textContent;
        const progress = element.querySelector<HTMLProgressElement>("progress");
        return Boolean(
          active &&
          active.getAttribute("data-chord") === current &&
          next &&
          nextCue?.includes(next) &&
          progress &&
          progress.value > 0 &&
          progress.value < progress.max,
        );
      }),
    )
    .toBe(true);
  await player(page)
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  await expect(status).toHaveText("Paused");
  const paused = await player(page).getByTestId("current-chord").innerText();
  const pausedProgress = await player(page)
    .getByRole("progressbar")
    .getAttribute("value");
  await player(page)
    .getByRole("button", { name: "Focus", exact: true })
    .click();
  await expect(page.getByTestId("current-chord")).toHaveText(paused);
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "value",
    pausedProgress!,
  );
  await expect(
    page.getByRole("list", { name: "Chord progression", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Progression actions" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect
    .poll(() => page.getByRole("progressbar").getAttribute("value"))
    .not.toBe(pausedProgress);
  await page
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  await page.getByRole("button", { name: "Exit focus", exact: true }).click();
  await expect(status).toHaveText("Paused");
  await player(page)
    .getByRole("button", { name: "Resume", exact: true })
    .click();
  await expect(status).toHaveText("Playing");
  await player(page)
    .getByRole("button", { name: "Stop playback", exact: true })
    .click();
  await expect(status).toHaveText("Stopped");
  await expect(player(page).getByTestId("current-chord")).toHaveText("G");
});

test("loops a short progression and finishes a non-repeating progression without changing the groove", async ({
  page,
}) => {
  await openChords(page);
  await createProgression(page, "Two quick changes", [
    { chord: "Am", duration: 2, unit: "beats" },
    { chord: "F", duration: 2, unit: "beats" },
  ]);
  await setPace(page);
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByTestId("current-chord")).toHaveText("F");
  await expect(
    player(page).getByRole("group", { name: "Next chord", exact: true }),
  ).toContainText("Am");
  await expect(player(page).getByTestId("current-chord")).toHaveText("Am");
  await player(page)
    .getByRole("button", { name: "Stop playback", exact: true })
    .click();
  await player(page)
    .getByRole("checkbox", { name: "Repeat progression", exact: true })
    .uncheck();
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page).getByTestId("current-chord")).toHaveText("F");
  await expect(
    player(page).getByRole("group", { name: "Next chord", exact: true }),
  ).toContainText("Finish");
  await expect(player(page).getByTestId("current-chord")).toHaveText(
    "Complete",
  );
  await expect(timeline(page).locator('[aria-current="step"]')).toHaveCount(0);
  // Completing chord guidance has never stopped the independent accompaniment.
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  await expect(
    page.getByRole("region", { name: "Drum accompaniment", exact: true }),
  ).toContainText("Basic Rock");
  await player(page)
    .getByRole("button", { name: "Stop playback", exact: true })
    .click();
});

test("keyboard menus and dialogs restore focus and timeline arrows do not change the groove", async ({
  page,
}) => {
  await openChords(page);
  const actions = player(page).getByRole("button", {
    name: "Progression actions",
  });
  await actions.focus();
  await page.keyboard.press("ArrowDown");
  await page
    .getByRole("menuitem", { name: "New progression", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const editor = page.getByRole("dialog", {
    name: "Create progression",
    exact: true,
  });
  await expect(editor.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(editor).toBeHidden();
  await expect(actions).toBeFocused();
  await player(page)
    .getByRole("combobox", { name: "Progression", exact: true })
    .selectOption("twelve-bar-blues-in-a");
  await timeline(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("region", { name: "Drum accompaniment", exact: true }),
  ).toContainText("Basic Rock");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("transport-status")).toHaveText("Counting in");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("transport-status")).toHaveText("Stopped");
});

test("reveals the active chord in a long progression without scrolling the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openChords(page);
  await player(page)
    .getByRole("combobox", { name: "Progression", exact: true })
    .selectOption("twelve-bar-blues-in-a");
  await setPace(page, 220);
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  const pageY = await page.evaluate(() => window.scrollY);
  await expect
    .poll(
      () =>
        timeline(page).evaluate((viewport) => {
          const active = viewport.querySelector('[aria-current="step"]');
          if (!active || viewport.scrollLeft === 0) return false;
          const bounds = active.getBoundingClientRect();
          const visible = viewport.getBoundingClientRect();
          return (
            bounds.left >= visible.left - 1 && bounds.right <= visible.right + 1
          );
        }),
      { timeout: 10000 },
    )
    .toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
  await player(page)
    .getByRole("button", { name: "Stop playback", exact: true })
    .click();
});

test("keeps the paused active chord visible when the viewport narrows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openChords(page);
  await player(page)
    .getByRole("combobox", { name: "Progression", exact: true })
    .selectOption("twelve-bar-blues-in-a");
  await setPace(page, 220);
  await player(page).getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    timeline(page).locator('[aria-current="step"]'),
  ).toHaveAccessibleName(/^Chord 4:/, { timeout: 10000 });
  await player(page)
    .getByRole("button", { name: "Pause playback", exact: true })
    .click();
  await expect(page.getByTestId("transport-status")).toHaveText("Paused");
  const pausedChord = await timeline(page)
    .locator('[aria-current="step"]')
    .getAttribute("aria-label");
  await page.setViewportSize({ width: 320, height: 720 });
  await expect
    .poll(() =>
      timeline(page).evaluate((viewport) => {
        const active = viewport.querySelector('[aria-current="step"]')!;
        const bounds = active.getBoundingClientRect();
        const visible = viewport.getBoundingClientRect();
        return (
          bounds.left >= visible.left - 1 && bounds.right <= visible.right + 1
        );
      }),
    )
    .toBe(true);
  await expect(timeline(page).locator('[aria-current="step"]')).toHaveAttribute(
    "aria-label",
    pausedChord!,
  );
  await expectNoOverflow(page);
  await player(page)
    .getByRole("button", { name: "Stop playback", exact: true })
    .click();
});

for (const theme of ["dark", "light"]) {
  test(`keeps long progressions readable, scrollable, and accessible in ${theme} mode`, async ({
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
    await openChords(page);
    await player(page)
      .getByRole("combobox", { name: "Progression", exact: true })
      .selectOption("twelve-bar-blues-in-a");
    for (const width of [320, 390, 640, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      // Complete the resize/observer layout before testing intentional scrolling.
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await expectNoOverflow(page);
      expect(
        await page
          .getByTestId("current-chord")
          .evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).fontSize),
          ),
      ).toBeGreaterThanOrEqual(80);
      expect(
        (await timeline(page).locator("li").first().boundingBox())!.width,
      ).toBeGreaterThanOrEqual(80);
      await timeline(page).focus();
      await page.keyboard.press("ArrowRight");
      expect(
        await timeline(page).evaluate((element) => element.scrollLeft),
      ).toBeGreaterThan(0);
      await timeline(page).evaluate((element) => {
        element.scrollLeft = 0;
      });
    }
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await player(page)
      .getByRole("button", { name: "Focus", exact: true })
      .click();
    await page.setViewportSize({ width: 320, height: 720 });
    await expectNoOverflow(page);
    await expect(
      page.getByRole("list", { name: "Chord progression", exact: true }),
    ).toHaveCount(1);
    const focused = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(focused.violations).toEqual([]);
  });
}
