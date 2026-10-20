import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { historySession } from "../../src/test/history-fixtures";
import type { PracticeSession } from "../../src/types/persistence";
import { navigate } from "./practice-helpers";

function trackBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("records, persists, and deletes a real practice session", async ({
  page,
}) => {
  const browserErrors = trackBrowserErrors(page);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "web-band-history-settings-v1",
      JSON.stringify({
        settings: { enabled: true, minimumDurationSeconds: 1 },
        version: 1,
      }),
    );
  });
  await page.goto("/settings");
  await expect(
    page.getByRole("checkbox", { name: "Save practice history" }),
  ).toBeChecked();
  await expect(
    page.getByRole("spinbutton", { name: "Minimum session duration" }),
  ).toHaveValue("1");
  await navigate(page, "Practice");
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Count-in length" })
    .selectOption("0");
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.getByTestId("transport-status")).toHaveText("Playing");
  await page.waitForTimeout(1_500);

  await navigate(page, "History");
  await expect(page).toHaveURL(/\/history$/);
  const session = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Basic Rock" }),
  });
  await expect(session).toBeVisible();
  await expect(
    session.getByText("Drums · rock · 4/4", { exact: true }),
  ).toBeVisible();
  await expect(session.getByText("90 BPM", { exact: true })).toBeVisible();
  await expect(session.getByText(/\d+ sec/)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
  await page
    .getByRole("button", { name: "More options for Basic Rock session" })
    .click();
  await page.getByRole("menuitem", { name: "Delete session" }).click();
  await page.getByRole("button", { name: "Delete session" }).click();
  await expect(
    page.getByRole("heading", { name: "Your practice journey starts here." }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

async function seedHistory(
  page: Page,
  sessions: PracticeSession[],
): Promise<void> {
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { level: 1, name: "Practice history" }),
  ).toBeVisible();
  // Test fixtures only: seed the existing object store after the app creates its schema.
  await page.evaluate(async (records) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("web-band");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("practiceSessions", "readwrite");
        const store = transaction.objectStore("practiceSessions");
        for (const record of records) store.put(record);
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      };
    });
  }, sessions);
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(
    Math.min(sessions.length, 30),
  );
}

test("combines calendar filters, sorting, mode-specific details and safe deletion", async ({
  page,
}) => {
  const errors = trackBrowserErrors(page);
  await page.clock.setFixedTime(new Date("2026-10-20T15:00:00"));
  const local = (day: number, hour = 12) =>
    new Date(2026, 9, day, hour).toISOString();
  await seedHistory(page, [
    historySession("metro", {
      practiceMode: "metronome",
      startedAt: local(20),
      durationSeconds: 31,
    }),
    historySession("drums", { startedAt: local(19), durationSeconds: 120 }),
    historySession("strum", {
      practiceMode: "strumming",
      startedAt: local(18),
      durationSeconds: 60,
    }),
    historySession("chords", {
      practiceMode: "chords",
      startedAt: local(17),
      durationSeconds: 90,
    }),
    historySession("tempo", {
      practiceMode: "tempoTrainer",
      startedAt: local(1),
      durationSeconds: 300,
      endingBpm: 120,
    }),
  ]);
  await expect(page.getByText("5 matching sessions")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Practice overview" }).locator("dl"),
  ).toHaveCount(4);
  await expect(
    page.getByRole("region", { name: "Practice activity" }).getByRole("img"),
  ).toHaveCount(7);
  await expect(
    page
      .getByRole("region", { name: "Practice overview" })
      .getByText("Tempo Trainer"),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Sort sessions" })
    .selectOption("longest");
  await expect(
    page.getByRole("article").first().getByRole("heading"),
  ).toHaveText("Tempo Trainer");
  await page
    .getByRole("button", { name: "Details for Tempo Trainer session" })
    .click();
  await expect(page.getByText("80 → 120 BPM")).toBeVisible();
  await expect(page.getByText("Starting BPM", { exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Date range" }).selectOption("7");
  await expect(page.getByRole("article")).toHaveCount(4);
  await page
    .getByRole("combobox", { name: "Practice mode" })
    .selectOption("metronome");
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByText("Quarter notes · 4/4 · Manual")).toBeVisible();
  await page
    .getByRole("button", { name: "More options for Metronome session" })
    .click();
  await page.getByRole("menuitem", { name: "Delete session" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page.getByRole("button", { name: "More options for Metronome session" }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "More options for Metronome session" })
    .click();
  await page.getByRole("menuitem", { name: "Delete session" }).click();
  await page.getByRole("button", { name: "Delete session" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching sessions" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Practice mode" }),
  ).toHaveValue("metronome");
  await expect(page.getByRole("combobox", { name: "Date range" })).toHaveValue(
    "7",
  );
  await expect(
    page.getByRole("combobox", { name: "Sort sessions" }),
  ).toHaveValue("longest");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("article")).toHaveCount(4);
  await page.getByRole("button", { name: "More history options" }).click();
  await page.getByRole("menuitem", { name: "Clear all history" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "This cannot be undone.",
  );
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your practice journey starts here." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your practice journey starts here." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("keeps populated history accessible and contained at mobile, tablet and desktop widths", async ({
  page,
}, testInfo) => {
  test.skip(
    !["chromium", "mobile-chromium"].includes(testInfo.project.name),
    "Layout and axe checks run in desktop and mobile Chromium.",
  );
  // Audit settled colors rather than a frame in the theme-change transition.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.setFixedTime(new Date("2026-10-20T15:00:00"));
  await seedHistory(page, [
    historySession("one", {
      patternName: "A".repeat(100),
      durationSeconds: 3661,
    }),
  ]);
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const title = await page.getByRole("heading", { level: 1 }).boundingBox();
    const navigation = await page
      .getByRole("navigation", { name: "Primary navigation" })
      .boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(navigation!.y + navigation!.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "More history options" }),
    ).toHaveJSProperty("offsetHeight", 44);
    for (const theme of ["dark", "light"]) {
      await page.evaluate((value) => {
        document.documentElement.dataset.theme = value;
      }, theme);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations, `${theme} theme at ${width}px`).toEqual([]);
    }
  }
  await page
    .getByRole("button", { name: `Details for ${"A".repeat(100)} session` })
    .click();
  await page.setViewportSize({ width: 320, height: 900 });
  // Resize observers and content-visibility settle on the next layout frame.
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  const today = page.getByRole("img", { name: /\(today\)/ });
  await page.keyboard.press("Tab");
  await today.focus();
  await expect(page.getByRole("tooltip")).toContainText("1h 1m 1s");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();
});

test("preserves the focus-only skip link and keyboard-operated history menus", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "webkit",
    "WebKit link tabbing follows the host's Full Keyboard Access setting.",
  );
  await page.goto("/history");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const skip = page.getByRole("link", { name: "Skip to main content" });
  const initialBox = await skip.boundingBox();
  expect(initialBox!.y + initialBox!.height).toBeLessThanOrEqual(0);
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "More history options" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "Backup & restore" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "More history options" }),
  ).toBeFocused();
  await page.getByRole("link", { name: "Manage backups in Settings" }).click();
  await expect(page.getByRole("button", { name: "Export data" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import backup" }),
  ).toBeVisible();
});

test.describe("local calendar attribution", () => {
  test.use({ timezoneId: "America/Los_Angeles" });

  test("counts a midnight-spanning session once on its local start day", async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date("2026-10-20T19:00:00.000Z"));
    await seedHistory(page, [
      historySession("before-midnight", {
        startedAt: "2026-10-20T06:59:00.000Z",
        durationSeconds: 180,
      }),
      historySession("after-midnight", {
        practiceMode: "metronome",
        startedAt: "2026-10-20T07:01:00.000Z",
        durationSeconds: 31,
      }),
    ]);
    await expect(
      page.getByRole("img", { name: "Monday, October 19, 2026: 3 min" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: "Tuesday, October 20, 2026 (today): 31 sec",
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Monday, October 19, 2026", exact: true })
        .getByText("1 session · 3 min"),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Practice overview" })
        .getByText("3 min 31 sec"),
    ).toHaveCount(2);
    await page
      .getByRole("combobox", { name: "Sort sessions" })
      .selectOption("oldest");
    await expect(
      page.getByRole("article").first().getByRole("heading"),
    ).toHaveText("Basic Rock");
  });
});

test("round-trips stored history through the existing application backup workflow", async ({
  page,
}) => {
  const sessions = [
    historySession("backup-drums"),
    historySession("backup-metronome", {
      practiceMode: "metronome",
      trainingMode: "progressive",
    }),
  ];
  await seedHistory(page, sessions);
  await page.getByRole("link", { name: "Manage backups in Settings" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data" }).click();
  const download = await downloadPromise;
  const path = (await download.path())!;
  const backup = JSON.parse(await readFile(path, "utf8")) as {
    version: number;
    data: { practiceSessions: PracticeSession[] };
  };
  expect(backup.version).toBe(5);
  expect(backup.data.practiceSessions).toEqual(
    expect.arrayContaining(sessions),
  );
  await navigate(page, "History");
  await page.getByRole("button", { name: "More history options" }).click();
  await page.getByRole("menuitem", { name: "Clear all history" }).click();
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your practice journey starts here." }),
  ).toBeVisible();

  for (const mode of [
    "Merge with current data",
    "Merge with current data",
    "Replace current data",
  ] as const) {
    await navigate(page, "Settings");
    await page.getByLabel("Choose backup file").setInputFiles(path);
    const dialog = page.getByRole("dialog", { name: "Review backup" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("radio", { name: new RegExp(mode) }).check();
    if (mode === "Replace current data")
      await dialog
        .getByRole("checkbox", {
          name: "I understand current data will be replaced",
        })
        .check();
    await dialog.getByRole("button", { name: "Import data" }).click();
    await expect(dialog).toBeHidden();
    await navigate(page, "History");
    await expect(page.getByRole("article")).toHaveCount(2);
    await expect(
      page.getByText("Quarter notes (starting) · 4/4 · Progressive"),
    ).toBeVisible();
  }
});
