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
