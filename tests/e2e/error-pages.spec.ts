import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["dark", "light"] as const) {
  test(`the ${theme} 404 page is accessible and returns to practice`, async ({
    page,
  }) => {
    await page.addInitScript((theme) => {
      window.localStorage.setItem(
        "web-band-appearance-v2",
        JSON.stringify({ theme }),
      );
    }, theme);

    const response = await page.goto("/this-beat-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("404 — Page not found | Web Band");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex",
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "This beat is missing." }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: "Explore grooves" }),
    ).toHaveAttribute("href", "/patterns");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.getByRole("link", { name: "Back to practice" }).click();
    await expect(page).toHaveURL(/\/practice$/);
    await expect(
      page.getByRole("heading", { name: "Basic Rock" }),
    ).toBeVisible();
  });
}

for (const recovery of ["Try again", "Back to practice"] as const) {
  test(`an application failure recovers with ${recovery}`, async ({ page }) => {
    await page.addInitScript(() => {
      const matchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (!window.sessionStorage.getItem("error-page-recovered")) {
          throw new Error("Simulated browser capability failure");
        }
        return matchMedia(query);
      };
      window.localStorage.setItem("error-page-saved-work", "preserved");
    });

    await page.goto("/about");
    await expect(
      page.getByRole("heading", { level: 1, name: "We lost the rhythm." }),
    ).toBeVisible();
    await expect(
      page.getByText("Simulated browser capability failure", { exact: true }),
    ).toBeHidden();

    // Restore the browser capability before attempting recovery.
    await page.evaluate(() =>
      window.sessionStorage.setItem("error-page-recovered", "true"),
    );
    await page
      .getByRole(recovery === "Try again" ? "button" : "link", {
        name: recovery,
      })
      .click();

    if (recovery === "Back to practice") {
      await expect(page).toHaveURL(/\/practice$/);
      await expect(
        page.getByRole("heading", { name: "Basic Rock" }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("heading", { name: "A drum room without the room." }),
      ).toBeVisible();
    }
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem("error-page-saved-work"),
      ),
    ).toBe("preserved");
  });
}
