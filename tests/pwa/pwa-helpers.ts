import { expect, type Page } from "@playwright/test";

export const offlinePattern = {
  id: "offline-pocket",
  name: "Offline Pocket",
};

export function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export async function establishServiceWorkerControl(
  page: Page,
  startUrl = "/practice",
): Promise<void> {
  await page.goto(startUrl);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (
    !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  ) {
    await page.reload();
  }
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return {
          controllerUrl: navigator.serviceWorker.controller?.scriptURL ?? null,
          scope: registration.scope,
        };
      }),
    )
    .toEqual({
      controllerUrl: `${new URL(startUrl, "http://localhost:3102").origin}/sw.js`,
      scope: "http://localhost:3102/",
    });
}

export async function seedOfflineData(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { name: "Saved on this device" }),
  ).toBeVisible();

  await page.evaluate(
    async ({ patternId, patternName }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("web-band");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      if (
        !database.objectStoreNames.contains("customPatterns") ||
        !database.objectStoreNames.contains("favoritePatterns")
      ) {
        database.close();
        throw new Error("Web Band persistence stores are unavailable.");
      }

      const timestamp = "2026-07-19T12:00:00.000Z";
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          ["customPatterns", "favoritePatterns"],
          "readwrite",
        );
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        transaction.oncomplete = () => resolve();
        transaction.objectStore("customPatterns").put({
          bars: 1,
          category: "custom",
          createdAt: timestamp,
          defaultBpm: 132,
          description: "A local groove saved for offline practice.",
          difficulty: "beginner",
          hits: [
            {
              id: "offline-kick-1",
              instrument: "kick",
              step: 0,
              velocity: 1,
            },
            {
              id: "offline-hat-1",
              instrument: "closedHat",
              step: 0,
              velocity: 0.82,
            },
            {
              id: "offline-snare-1",
              instrument: "snare",
              step: 2,
              velocity: 0.92,
            },
            {
              id: "offline-hat-2",
              instrument: "closedHat",
              step: 4,
              velocity: 0.74,
            },
          ],
          id: patternId,
          isBuiltIn: false,
          name: patternName,
          recommendedBpmRange: { max: 180, min: 60 },
          subdivision: 8,
          timeSignature: { denominator: 4, numerator: 4 },
          updatedAt: timestamp,
        });
        transaction.objectStore("favoritePatterns").put({
          createdAt: timestamp,
          patternId,
        });
      });
      database.close();

      const mixerChannel = { muted: false, solo: false, volume: 1 };
      localStorage.setItem(
        "web-band-practice-settings-v4",
        JSON.stringify({
          bpm: 132,
          bpmAdjustmentStep: 5,
          countInMeasures: 0,
          fillFrequency: null,
          humanization: 0.08,
          masterVolume: 0.65,
          mixer: {
            cymbals: mixerChannel,
            hiHat: mixerChannel,
            kick: mixerChannel,
            percussion: mixerChannel,
            snare: mixerChannel,
            toms: mixerChannel,
          },
          restoreLastPractice: true,
          selectedPatternId: patternId,
          soundCharacter: "balanced",
          swing: 0.12,
          wakeLockEnabled: false,
        }),
      );
      localStorage.setItem(
        "web-band-appearance-v2",
        JSON.stringify({
          beatFlashIntensity: "strong",
          reducedMotion: true,
          theme: "light",
          visualSubdivisionDetail: "sixteenths",
        }),
      );
      localStorage.setItem("web-band-onboarding-dismissed", "true");
      localStorage.setItem(
        "web-band-recent-patterns-v1",
        JSON.stringify([patternId]),
      );
    },
    { patternId: offlinePattern.id, patternName: offlinePattern.name },
  );
}
