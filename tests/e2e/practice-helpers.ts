import type { Page } from "@playwright/test";

export async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
  const link = page.getByRole("link", { name, exact: true });
  await link.focus();
  await link.press("Enter");
}

export async function openControls(page: Page, section?: string) {
  const trigger = page.getByRole("button", { name: "Controls", exact: true });
  if ((await trigger.getAttribute("aria-expanded")) !== "true")
    await trigger.click();
  if (section) {
    const disclosure = page.getByRole("button", { name: section, exact: true });
    if ((await disclosure.getAttribute("aria-expanded")) !== "true")
      await disclosure.click();
  }
}

export async function closeControls(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) >= 1024) {
    await page.getByRole("button", { name: "Hide controls" }).click();
  } else {
    await page
      .getByRole("dialog", { name: "Practice controls" })
      .getByRole("button", { name: "Close", exact: true })
      .click();
  }
}

export async function openPresetManager(page: Page) {
  await page.getByRole("button", { name: "Open presets" }).click();
  await page.getByRole("menuitem", { name: "Manage presets" }).click();
}
