import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  closeControls,
  navigate,
  openControls,
  openPresetManager,
} from "./practice-helpers";

async function selectMetronome(page: Page) {
  await page.goto("/practice");
  await page
    .getByRole("radio", { name: "Metronome", exact: true })
    .locator("..")
    .click();
  await expect(
    page.getByRole("heading", { name: "Metronome", exact: true }),
  ).toBeVisible();
}

async function setBpm(page: Page, bpm: number) {
  const input = page.getByRole("spinbutton", { name: "Current BPM" });
  await input.fill(String(bpm));
  await input.press("Enter");
}

async function setMeter(page: Page, meter: string) {
  await page.getByRole("combobox", { name: "Time signature" }).click();
  await page.getByRole("option", { name: meter, exact: true }).click();
}

test("runs true audio-clock triplets and cancels future clicks on Stop", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const starts: number[] = [];
    Object.defineProperty(window, "__metronomeStarts", { value: starts });
    const original = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (time = 0) {
      if (this.type === "triangle") {
        starts.push(time);
        Object.defineProperty(window, "__metronomeContext", {
          value: this.context,
          configurable: true,
        });
      }
      return original.call(this, time);
    };
  });
  await selectMetronome(page);
  await setBpm(page, 80);
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page
    .getByRole("radio", { name: "3 — Eighth-note triplets", exact: true })
    .locator("..")
    .click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const starts = () =>
    page.evaluate(
      () =>
        (window as unknown as { __metronomeStarts: number[] })
          .__metronomeStarts,
    );
  await expect
    .poll(async () => (await starts()).length)
    .toBeGreaterThanOrEqual(8);
  const times = await starts();
  for (let index = 1; index < 8; index++)
    expect(times[index]! - times[index - 1]!).toBeCloseTo(0.25, 2);
  await setBpm(page, 160);
  await expect
    .poll(async () => (await starts()).length)
    .toBeGreaterThanOrEqual(times.length + 8);
  const faster = (await starts()).slice(-5);
  for (let index = 1; index < faster.length; index++)
    expect(faster[index]! - faster[index - 1]!).toBeCloseTo(0.125, 2);
  await page.getByRole("button", { name: "Pause playback" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Paused");
  const pausedCount = (await starts()).length;
  await page.waitForTimeout(400); // Observe a silent interval, not a musical scheduling clock.
  expect((await starts()).length).toBe(pausedCount);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect
    .poll(async () => (await starts()).length)
    .toBeGreaterThan(pausedCount);
  await page.evaluate(async () => {
    await (
      window as unknown as { __metronomeContext: AudioContext }
    ).__metronomeContext.suspend();
  });
  await expect(page.getByTestId("transport-status")).toHaveText(
    "Audio suspended — press Play to resume",
  );
  await page.getByRole("button", { name: "Resume audio", exact: true }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  await page.getByRole("button", { name: "Stop playback" }).click();
  const stoppedCount = (await starts()).length;
  await page.waitForTimeout(400);
  expect((await starts()).length).toBe(stoppedCount);
  expect(errors).toEqual([]);
});

test("supports compound meter, manual practice, Controls, Focus, and persisted configuration at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await selectMetronome(page);
  await setMeter(page, "6/8");
  await page
    .getByRole("radio", { name: "3 — Eighth notes", exact: true })
    .locator("..")
    .click();
  await page
    .getByRole("radio", { name: "Pulse Only", exact: true })
    .locator("..")
    .click();
  await page.getByRole("button", { name: "Accent beat 2" }).click();
  await expect(page.getByRole("button", { name: /Accent beat/ })).toHaveCount(
    2,
  );
  await expect(
    page.getByText("BPM = dotted-quarter pulse", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Current groove" }),
  ).toHaveCount(0);
  await openControls(page);
  await expect(
    page.getByRole("slider", { name: "Metronome volume" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Drum Kit" })).toHaveCount(0);
  await closeControls(page);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const targets = await page
    .locator(
      '[aria-label="Practice player"] button, [aria-label="Practice player"] label:has([role="radio"])',
    )
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        })
        .filter(
          ({ width, height }) =>
            width > 0 && height > 0 && (width < 44 || height < 44),
        ),
    );
  expect(targets).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Metronome", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("combobox", { name: "Time signature" }),
  ).toContainText("6/8");
  await expect(
    page.getByRole("radio", { name: "Pulse Only", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Accent beat 2" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("1");
  await setBpm(page, 220);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  await expect(
    page.getByRole("combobox", { name: "Time signature" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Metronome", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Basic Rock", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Beat visualization" }),
  ).toHaveAttribute("data-motion-reduced", "true");
  await page.getByRole("button", { name: "Pause playback" }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Exit focus" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Paused");
  await page.getByRole("button", { name: "Stop playback" }).click();
});

test("progresses subdivisions at constant BPM, preserves pause, and stops at the end", async ({
  page,
}) => {
  await selectMetronome(page);
  await setMeter(page, "2/4");
  await setBpm(page, 220);
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page
    .getByRole("radio", { name: "Progressive", exact: true })
    .locator("..")
    .click();
  await openControls(page, "Training");
  await page
    .getByRole("combobox", { name: "Measures per stage" })
    .selectOption("2");
  await page
    .getByRole("combobox", { name: "After the final stage" })
    .selectOption("stop");
  await closeControls(page);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("Stage 2 of 4", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "2 — Eighth notes", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Pause playback" }).click();
  const stage = await page
    .locator('[aria-label="Progressive training"]')
    .textContent();
  await page.waitForTimeout(350);
  expect(
    await page.locator('[aria-label="Progressive training"]').textContent(),
  ).toBe(stage);
  await expect(
    page.getByRole("spinbutton", { name: "Current BPM" }),
  ).toHaveValue("220");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText("Stage 3 of 4", { exact: true })).toBeVisible();
  await expect(page.getByTestId("transport-status")).toHaveText("Stopped", {
    timeout: 7000,
  });
  await expect(page.getByText("Stage 1 of 4", { exact: true })).toBeVisible();
  await expect(
    page.locator('[aria-label="Beat visualization"] [data-active="true"]'),
  ).toHaveCount(0);
});

test("saves metronome presets and journal entries without a drum pattern", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "web-band-history-settings-v1",
      JSON.stringify({
        version: 1,
        settings: { enabled: true, minimumDurationSeconds: 1 },
      }),
    ),
  );
  await selectMetronome(page);
  await setBpm(page, 100);
  await page
    .getByRole("radio", { name: "2 — Eighth notes", exact: true })
    .locator("..")
    .click();
  await page.getByRole("button", { name: "Save current setup" }).click();
  await page
    .getByRole("textbox", { name: "Preset name" })
    .fill("Metronome eighths");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await page
    .getByRole("radio", { name: "Drums", exact: true })
    .locator("..")
    .click();
  await openPresetManager(page);
  await page.getByRole("tab", { name: "All", exact: true }).click();
  const preset = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "Metronome eighths",
      exact: true,
    }),
  });
  await preset
    .getByRole("button", { name: "Load Metronome eighths", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Metronome", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "2 — Eighth notes", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  await page.waitForTimeout(1300);
  await page.getByRole("button", { name: "Stop playback" }).click();
  await navigate(page, "History");
  const session = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Metronome", exact: true }),
  });
  await expect(session).toBeVisible();
  await expect(
    session.getByText("Eighth notes · 4/4", { exact: true }),
  ).toBeVisible();
  await expect(session.getByText("100 BPM", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Metronome", exact: true }),
  ).toBeVisible();
});

for (const theme of ["dark", "light"] as const) {
  test(`${theme} metronome has accessible controls and contrast`, async ({
    page,
  }, testInfo) => {
    test.skip(
      !["chromium", "mobile-chromium"].includes(testInfo.project.name),
      "Axe coverage uses Chromium.",
    );
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
    await selectMetronome(page);
    await page
      .getByRole("radio", { name: "Progressive", exact: true })
      .locator("..")
      .click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await openControls(page, "Training");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
