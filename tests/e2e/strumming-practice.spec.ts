import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const eighthPattern = {
  name: "Eighth-Note Downstrokes",
  positions: ["1", "&", "2", "&", "3", "&", "4", "&"],
};
const sixteenthPattern = {
  name: "Basic Pop",
  positions: [
    "1",
    "e",
    "&",
    "a",
    "2",
    "e",
    "&",
    "a",
    "3",
    "e",
    "&",
    "a",
    "4",
    "e",
    "&",
    "a",
  ],
};

function player(page: Page) {
  return page.getByRole("region", { name: "Practice player", exact: true });
}

function guidance(page: Page) {
  return page.getByRole("region", {
    name: "Strumming trainer guidance",
    exact: true,
  });
}

function patternSelect(page: Page, meter = "4/4") {
  return player(page).getByRole("combobox", {
    name: `Pattern for ${meter}`,
    exact: true,
  });
}

async function openStrumming(page: Page) {
  await page.goto("/practice");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("radiogroup", { name: "Practice mode" })
    .getByRole("radio", { name: "Strumming", exact: true })
    .locator("..")
    .click();
  await expect(patternSelect(page)).toBeEnabled();
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

async function expectSingleSequence(
  page: Page,
  pattern: { name: string; positions: string[] },
) {
  await expect(
    page.getByRole("list", { name: /action sequence$/ }),
  ).toHaveCount(1);
  const sequence = page.getByRole("list", {
    name: `${pattern.name} action sequence`,
    exact: true,
  });
  await expect(sequence).toBeVisible();
  const steps = sequence.getByRole("listitem");
  await expect(steps).toHaveCount(pattern.positions.length);
  expect(
    await steps.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-position")),
    ),
  ).toEqual(pattern.positions);
  const labels = await steps.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("aria-label")),
  );
  for (const [index, label] of labels.entries()) {
    expect(label).toMatch(
      new RegExp(
        `^Step ${index + 1}, beat \\d+, position (?:[1-6]|e|&|a): (?:Down|Up|Mute|Rest|Hold)(?:, accent)?$`,
      ),
    );
  }
  await expect(
    page.getByRole("region", { name: "Beat visualization" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Strumming trainer", exact: true }),
  ).toHaveCount(0);
  return sequence;
}

async function expectReadableCues(page: Page) {
  const trainer = guidance(page);
  for (const name of ["Current action", "Next action"]) {
    const cue = trainer.getByRole("group", { name, exact: true });
    await expect(cue).toBeVisible();
    await expect(cue).toHaveAccessibleName(name);
    await expect(
      cue.getByText(/^(Down|Up|Mute|Rest|Hold)$/, { exact: true }),
    ).toBeVisible();
  }
  await expect(
    trainer.locator(
      '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]',
    ),
  ).toHaveCount(0);
}

async function expectPlayingCues(page: Page) {
  // Read the highlight and both cues in one frame, not either side of a tick.
  await expect
    .poll(() =>
      guidance(page).evaluate((element) => {
        const steps = Array.from(element.querySelectorAll("li[data-action]"));
        const active = steps.filter(
          (step) => step.getAttribute("aria-current") === "step",
        );
        const index = steps.indexOf(active[0]);
        const labels: Record<string, string> = {
          down: "Down",
          hold: "Hold",
          mute: "Mute",
          rest: "Rest",
          up: "Up",
        };
        const currentAction = active[0]?.getAttribute("data-action") ?? "";
        const nextAction =
          steps[(index + 1) % steps.length]?.getAttribute("data-action") ?? "";
        return {
          active: active.length,
          currentMatches:
            index >= 0 &&
            Boolean(
              element
                .querySelector('[aria-label="Current action"]')
                ?.textContent?.includes(labels[currentAction]),
            ),
          nextMatches:
            index >= 0 &&
            Boolean(
              element
                .querySelector('[aria-label="Next action"]')
                ?.textContent?.includes(labels[nextAction]),
            ),
        };
      }),
    )
    .toEqual({ active: 1, currentMatches: true, nextMatches: true });
  await expectReadableCues(page);
}

async function sequenceData(sequence: Locator) {
  return sequence.getByRole("listitem").evaluateAll((elements) =>
    elements.map((element) => ({
      action: element.getAttribute("data-action"),
      label: element.getAttribute("aria-label"),
      position: element.getAttribute("data-position"),
    })),
  );
}

async function seedAppearance(
  page: Page,
  theme: "light" | "dark",
  reducedMotion = false,
) {
  await page.addInitScript(
    ({ theme, reducedMotion }) =>
      localStorage.setItem(
        "web-band-appearance-v2",
        JSON.stringify({
          beatFlashIntensity: "standard",
          reducedMotion,
          theme,
          visualSubdivisionDetail: "pattern",
        }),
      ),
    { theme, reducedMotion },
  );
}

for (const width of [320, 390, 768, 1280]) {
  test(`keeps eighth- and sixteenth-note strumming in one readable player at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openStrumming(page);
    await page.evaluate(() => document.fonts.ready);
    const controls = page.getByRole("button", {
      name: "Controls",
      exact: true,
    });
    const accompaniment = page.getByRole("region", {
      name: "Drum accompaniment",
    });
    await expect(accompaniment.getByRole("heading")).toHaveText("Basic Rock");
    await expect(
      accompaniment.getByRole("button", { name: "Change Groove", exact: true }),
    ).toBeVisible();

    for (const pattern of [eighthPattern, sixteenthPattern]) {
      await expect(controls).toHaveAttribute("aria-expanded", "false");
      await expect(patternSelect(page)).toBeVisible();
      await patternSelect(page).selectOption({ label: pattern.name });
      const sequence = await expectSingleSequence(page, pattern);
      await expect(
        player(page).getByRole("list", {
          name: `${pattern.name} action sequence`,
        }),
      ).toHaveCount(1);
      await expectReadableCues(page);
      const helpTarget = await player(page)
        .getByRole("button", { name: "Symbol help" })
        .boundingBox();
      expect(helpTarget!.width).toBeGreaterThanOrEqual(44);
      expect(helpTarget!.height).toBeGreaterThanOrEqual(44);
      await expect(sequence.locator('[aria-current="step"]')).toHaveCount(0);
      await expect(accompaniment.getByRole("heading")).toHaveText("Basic Rock");
      await expectNoOverflow(page);

      const timeline = guidance(page).getByRole("region", {
        name: "Strumming timeline",
      });
      if (width <= 390 && pattern === sixteenthPattern) {
        expect(
          await timeline.evaluate(
            (element) => element.scrollWidth > element.clientWidth,
          ),
        ).toBe(true);
        await timeline.evaluate((element) => {
          element.scrollLeft = element.scrollWidth;
        });
        await expect
          .poll(() =>
            timeline.evaluate((element) => {
              const viewport = element.getBoundingClientRect();
              const last = element.querySelector("li:last-child")!;
              const step = last.getBoundingClientRect();
              return (
                step.left >= viewport.left && step.right <= viewport.right + 1
              );
            }),
          )
          .toBe(true);
        await expectNoOverflow(page);
      }
      if (width === 1280) {
        expect(
          await timeline.evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
        ).toBe(true);
        const widths = await sequence
          .getByRole("listitem")
          .evaluateAll((steps) =>
            steps.map((step) => step.getBoundingClientRect().width),
          );
        expect(Math.min(...widths)).toBeGreaterThanOrEqual(30);
      }
    }
  });
}

for (const height of [900, 768]) {
  test(`keeps the desktop strumming player compact at 1280x${height}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height });
    await openStrumming(page);
    await patternSelect(page).selectOption({ label: sixteenthPattern.name });
    await expectSingleSequence(page, sixteenthPattern);
    await page.evaluate(() => document.fonts.ready);
    // A generous component budget catches stacked duplicate displays without
    // depending on the exact height of the page header or a particular font.
    expect((await player(page).boundingBox())!.height).toBeLessThanOrEqual(600);
    expect((await guidance(page).boundingBox())!.height).toBeLessThanOrEqual(
      300,
    );
    const timeline = guidance(page).getByRole("region", {
      name: "Strumming timeline",
    });
    expect((await timeline.boundingBox())!.height).toBeLessThanOrEqual(120);
    await expectNoOverflow(page);
  });
}

for (const meter of [
  {
    groove: "Simple 3/4",
    meter: "3/4",
    strumming: { name: "Basic 3/4", positions: ["1", "&", "2", "&", "3", "&"] },
  },
  {
    groove: "Simple 6/8",
    meter: "6/8",
    strumming: { name: "Basic 6/8", positions: ["1", "2", "3", "4", "5", "6"] },
  },
]) {
  test(`validates ${meter.meter} accompaniment before playing and keeps its groove independent`, async ({
    page,
  }) => {
    await openStrumming(page);
    await page
      .getByRole("combobox", { name: "Count-in length" })
      .selectOption("0");
    const accompaniment = page.getByRole("region", {
      name: "Drum accompaniment",
    });
    await accompaniment.getByRole("button", { name: "Change Groove" }).click();
    await page
      .getByRole("combobox", { name: "Current pattern" })
      .fill(meter.groove);
    await page
      .getByRole("option", {
        name: `${meter.groove} - ${meter.meter}`,
        exact: true,
      })
      .click();
    await expect(accompaniment.getByRole("heading")).toHaveText(meter.groove);
    const select = patternSelect(page, meter.meter);
    await expect(select).toHaveAttribute("aria-invalid", "true");
    await expect(select.locator("option:checked")).toHaveText(
      "Choose a compatible pattern",
    );
    await expect(
      select.locator('option[value="basic-pop-strumming"]'),
    ).toHaveCount(0);
    await expect(player(page).getByRole("alert")).toContainText(
      `cannot follow this ${meter.meter} drum groove`,
    );

    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(
      player(page)
        .getByRole("alert")
        .filter({
          hasText: `Choose a ${meter.meter} strumming pattern before playing ${meter.groove}.`,
        }),
    ).toHaveCount(1);
    await expect(page.getByTestId("transport-status")).not.toHaveText(
      /^(Playing|Counting in)$/,
    );
    await expect(guidance(page).locator('[aria-current="step"]')).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Stop playback" }),
    ).toBeDisabled();

    await select.selectOption({ label: meter.strumming.name });
    await expect(select).toHaveAttribute("aria-invalid", "false");
    await expectSingleSequence(page, meter.strumming);
    await expect(accompaniment.getByRole("heading")).toHaveText(meter.groove);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByTestId("transport-status")).toHaveText("Playing");
    await expectPlayingCues(page);
    await expect(accompaniment.getByRole("heading")).toHaveText(meter.groove);
    await page.getByRole("button", { name: "Stop playback" }).click();
    await expect(guidance(page).locator('[aria-current="step"]')).toHaveCount(
      0,
    );
  });
}

test("counts in, pauses and resumes cues, and preserves a single live timeline through Focus", async ({
  page,
}) => {
  await openStrumming(page);
  await patternSelect(page).selectOption({ label: sixteenthPattern.name });
  const sequence = await expectSingleSequence(page, sixteenthPattern);
  const data = await sequenceData(sequence);
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("1");
  const bpm = page.getByRole("spinbutton", { name: "Current BPM" });
  await bpm.fill("120");
  await bpm.press("Enter");
  const current = guidance(page).getByRole("group", { name: "Current action" });
  const next = guidance(page).getByRole("group", { name: "Next action" });
  const status = page.getByTestId("transport-status");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(status).toHaveText("Counting in");
  await expect(current).toContainText("Count in");
  await expect(current).toContainText("Listen, then start on 1.");
  await expect(next.getByText("Down", { exact: true })).toBeVisible();
  await expect(sequence.locator('[aria-current="step"]')).toHaveCount(0);
  await expect(patternSelect(page)).toBeDisabled();
  await expect(status).toHaveText("Playing", { timeout: 7000 });
  await expectPlayingCues(page);
  const active = sequence.locator('[aria-current="step"]');
  const firstObservedStep = await active.getAttribute("aria-label");
  await expect
    .poll(() => active.getAttribute("aria-label"))
    .not.toBe(firstObservedStep);

  const pause = page.getByRole("button", { name: "Pause playback" });
  // Capture the visible cues in the click event, immediately before React
  // pauses audio, rather than guessing which step a later click will reach.
  const cuesAtPause = await pause.evaluateHandle((button) => {
    const cues = { current: "", next: "" };
    button.addEventListener(
      "click",
      () => {
        const trainer = document.querySelector(
          '[aria-label="Strumming trainer guidance"]',
        )!;
        cues.current = trainer.querySelector(
          '[aria-label="Current action"]',
        )!.textContent!;
        cues.next = trainer.querySelector(
          '[aria-label="Next action"]',
        )!.textContent!;
      },
      { capture: true, once: true },
    );
    return cues;
  });
  await pause.click();
  const pausedCues = await cuesAtPause.jsonValue();
  await cuesAtPause.dispose();
  await expect(status).toHaveText("Paused");
  await expect(active).toHaveCount(0);
  await expectReadableCues(page);
  await expect(current).toHaveText(pausedCues.current);
  await expect(next).toHaveText(pausedCues.next);
  // Cross several sixteenth-note durations: paused cues must remain frozen.
  await page.waitForTimeout(650);
  await expect(current).toHaveText(pausedCues.current);
  await expect(next).toHaveText(pausedCues.next);
  await expect(active).toHaveCount(0);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(status).toHaveText("Playing");
  await expect(current).not.toContainText("Count in");
  await expectPlayingCues(page);
  const resumedStep = await active.getAttribute("aria-label");
  await expect
    .poll(() => active.getAttribute("aria-label"))
    .not.toBe(resumedStep);

  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: sixteenthPattern.name,
      exact: true,
    }),
  ).toBeFocused();
  const focusedSequence = await expectSingleSequence(page, sixteenthPattern);
  expect(await sequenceData(focusedSequence)).toEqual(data);
  await expect(
    page.getByRole("combobox", { name: /^Pattern for / }),
  ).toHaveCount(0);
  for (const name of ["New", "Edit", "Pattern actions", "Change Groove"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  }
  await expectPlayingCues(page);
  const focusedActive = focusedSequence.locator('[aria-current="step"]');
  const focusedStep = await focusedActive.getAttribute("aria-label");
  await expect
    .poll(() => focusedActive.getAttribute("aria-label"))
    .not.toBe(focusedStep);
  await page.getByRole("button", { name: "Exit focus" }).click();
  await expect(status).toHaveText("Playing");
  await expectSingleSequence(page, sixteenthPattern);
  await expectPlayingCues(page);
  await page.getByRole("button", { name: "Stop playback" }).click();
  await expect(status).toHaveText("Stopped");
  await expect(active).toHaveCount(0);
  await expect(current.getByText("Down", { exact: true })).toBeVisible();
  await expect(next.getByText("Hold", { exact: true })).toBeVisible();
  await expect(patternSelect(page)).toBeEnabled();
});

test("manages grouped custom patterns and scrolls the timeline by keyboard at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openStrumming(page);
  const select = patternSelect(page);
  await expect(select).toHaveAccessibleName("Pattern for 4/4");
  expect(
    await select.locator('optgroup[label="Built-in patterns"] option').count(),
  ).toBeGreaterThan(1);
  await select.focus();
  await expect(select).toBeFocused();
  await page.keyboard.press("Tab");
  const newButton = player(page).getByRole("button", {
    name: "New",
    exact: true,
  });
  await expect(newButton).toBeFocused();
  await page.keyboard.press("Enter");
  const create = page.getByRole("dialog", { name: "Create strumming pattern" });
  await expect(create).toBeVisible();
  await create
    .getByRole("textbox", { name: "Pattern name" })
    .fill("Keyboard Sixteenths");
  await create
    .getByRole("combobox", { name: "Subdivision", exact: true })
    .selectOption("16");
  const save = create.getByRole("button", { name: "Save strumming pattern" });
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(create).toBeHidden();
  await expect(newButton).toBeFocused();
  await expect(select.locator("option:checked")).toHaveText(
    "Keyboard Sixteenths",
  );
  await expect(
    select.locator('optgroup[label="Custom patterns"] option'),
  ).toHaveText(["Keyboard Sixteenths"]);
  await expectSingleSequence(page, {
    ...sixteenthPattern,
    name: "Keyboard Sixteenths",
  });

  const timeline = guidance(page).getByRole("region", {
    name: "Strumming timeline",
  });
  await timeline.focus();
  await expect(timeline).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => timeline.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expect(
    page
      .getByRole("region", { name: "Drum accompaniment" })
      .getByRole("heading"),
  ).toHaveText("Basic Rock");
  await expectNoOverflow(page);

  await player(page).getByRole("button", { name: "Edit", exact: true }).focus();
  await page.keyboard.press("Enter");
  const edit = page.getByRole("dialog", { name: "Edit strumming pattern" });
  await expect(edit).toBeVisible();
  await edit
    .getByRole("textbox", { name: "Pattern name" })
    .fill("Keyboard Sixteenths Edited");
  await edit.getByRole("button", { name: "Save strumming pattern" }).focus();
  await page.keyboard.press("Enter");
  await expect(edit).toBeHidden();
  await expect(select.locator("option:checked")).toHaveText(
    "Keyboard Sixteenths Edited",
  );
  const actions = player(page).getByRole("button", { name: "Pattern actions" });
  await actions.focus();
  await page.keyboard.press("Enter");
  const deleteItem = page.getByRole("menuitem", {
    name: "Delete pattern",
    exact: true,
  });
  await expect(deleteItem).toBeVisible();
  await deleteItem.focus();
  await page.keyboard.press("Enter");
  await player(page)
    .getByRole("button", { name: "Cancel", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(actions).toBeFocused();
  await page.keyboard.press("Enter");
  await deleteItem.focus();
  await page.keyboard.press("Enter");
  const confirm = player(page).getByRole("button", {
    name: "Delete Keyboard Sixteenths Edited permanently",
    exact: true,
  });
  await confirm.focus();
  await page.keyboard.press("Enter");
  await expect(select.locator("option:checked")).toHaveText(
    "Quarter-Note Downstrokes",
  );
  await expect(select).toBeFocused();
  await expect(select.locator('optgroup[label="Custom patterns"]')).toHaveCount(
    0,
  );
  await expectSingleSequence(page, {
    ...eighthPattern,
    name: "Quarter-Note Downstrokes",
  });
  await expectReadableCues(page);
  await expectNoOverflow(page);
});

for (const theme of ["light", "dark"] as const) {
  for (const width of [320, 1280]) {
    test(`${theme} strumming and Focus are accessible at ${width}px`, async ({
      page,
    }, testInfo) => {
      test.skip(
        !["chromium", "mobile-chromium"].includes(testInfo.project.name),
        "Axe audits run in desktop and mobile Chromium.",
      );
      await page.setViewportSize({ width, height: 900 });
      await seedAppearance(page, theme, true);
      await openStrumming(page);
      await patternSelect(page).selectOption({ label: sixteenthPattern.name });
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expectSingleSequence(page, sixteenthPattern);
      await expectReadableCues(page);
      const audit = async () => {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(result.violations).toEqual([]);
      };
      await audit();
      await page.getByRole("button", { name: "Focus", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("heading", { level: 1, name: sixteenthPattern.name }),
      ).toBeFocused();
      await expectSingleSequence(page, sixteenthPattern);
      await expectReadableCues(page);
      await expectNoOverflow(page);
      await audit();
      await page.getByRole("button", { name: "Exit focus" }).focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("button", { name: "Focus", exact: true }),
      ).toBeFocused();
    });
  }
}

for (const preference of ["system", "saved"] as const) {
  test(`${preference} reduced motion retains strumming highlights without animations`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Reduced-motion playback integration runs in desktop Chromium.",
    );
    await page.emulateMedia({
      reducedMotion: preference === "system" ? "reduce" : "no-preference",
    });
    await seedAppearance(page, "dark", preference === "saved");
    await openStrumming(page);
    await patternSelect(page).selectOption({ label: sixteenthPattern.name });
    await page
      .getByRole("combobox", { name: "Count-in length" })
      .selectOption("0");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByTestId("transport-status")).toHaveText("Playing");
    const expectStaticHighlight = async () => {
      await expectPlayingCues(page);
      const timeline = guidance(page).getByRole("region", {
        name: "Strumming timeline",
      });
      await expect(timeline).toHaveAttribute("data-motion-reduced", "true");
      const active = timeline.locator('[aria-current="step"]');
      await expect(active).toHaveCSS("transform", "none");
      await expect(active).not.toHaveCSS("box-shadow", "none");
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document
                .getAnimations()
                .filter((animation) => animation.playState === "running")
                .length,
          ),
        )
        .toBe(0);
    };
    await expectStaticHighlight();
    await page.getByRole("button", { name: "Focus", exact: true }).click();
    await expectSingleSequence(page, sixteenthPattern);
    await expectStaticHighlight();
    await page.getByRole("button", { name: "Stop now", exact: true }).click();
    await expect(guidance(page).locator('[aria-current="step"]')).toHaveCount(
      0,
    );
  });
}
