import { expect, test } from "@playwright/test";

test("hides native BPM steppers while retaining numeric input semantics", async ({
  page,
}) => {
  await page.goto("/practice");
  const input = page.getByRole("spinbutton", { name: "Current BPM" });
  await expect(input).toBeEnabled();
  await input.hover();
  await input.focus();

  await expect(input).toHaveAttribute("type", "number");
  await expect(input).toHaveAttribute("inputmode", "numeric");
  await expect(input).toHaveCSS("appearance", "textfield");
});

test("retains keyboard stepping and commits within the BPM limits", async ({
  page,
}) => {
  await page.goto("/practice");
  const input = page.getByRole("spinbutton", { name: "Current BPM" });
  await expect(input).toBeEnabled();

  await input.fill("189");
  await input.press("ArrowUp");
  await input.press("Enter");
  await expect(input).toHaveValue("190");

  await input.fill("39");
  await input.press("Enter");
  await expect(input).toHaveValue("40");

  await input.fill("221");
  await input.press("Enter");
  await expect(input).toHaveValue("220");
});

test("uses a subtle keyboard focus indicator instead of an outer BPM ring", async ({
  page,
}) => {
  await page.goto("/practice");
  const input = page.getByRole("spinbutton", { name: "Current BPM" });
  await expect(input).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  const unfocused = await input.evaluate((element) => ({
    borderColor: getComputedStyle(element).borderBottomColor,
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  await page.getByRole("button", { name: "Decrease BPM by 1" }).focus();
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await expect(input).not.toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");

  const focus = await input.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      outlineWidth: styles.outlineWidth,
      ringWidth: styles.getPropertyValue("--tw-ring-shadow").trim(),
      borderColor: styles.borderBottomColor,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    };
  });

  expect(focus.outlineWidth).toBe("0px");
  expect(focus.ringWidth).not.toMatch(/\b3px\b/);
  expect(focus.borderColor).not.toBe(unfocused.borderColor);
  await expect(input).toHaveCSS("border-bottom-width", "1px");
  await expect(input).toHaveCSS("border-bottom-style", "solid");
  for (const side of ["top", "left", "right"]) {
    await expect(input).toHaveCSS(`border-${side}-width`, "0px");
  }
  expect(focus.width).toBe(unfocused.width);
  expect(focus.height).toBe(unfocused.height);
});

for (const width of [320, 1280]) {
  test(`shows the complete BPM value without shifting or overflowing at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/practice");
    const input = page.getByRole("spinbutton", { name: "Current BPM" });
    await expect(input).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);

    let initialWidth: number | undefined;
    for (const value of ["90", "189", "220"]) {
      await input.fill(value);
      await input.press("Enter");
      await expect(input).toHaveValue(value);

      for (const focused of [false, true]) {
        if (focused) await input.focus();

        const dimensions = await input.evaluate((element) => {
          const styles = getComputedStyle(element);
          const measure = document.createElement("span");
          measure.style.cssText =
            "position: absolute; visibility: hidden; white-space: pre";
          measure.style.font = styles.font;
          measure.style.fontVariantNumeric = styles.fontVariantNumeric;
          measure.style.letterSpacing = styles.letterSpacing;
          measure.textContent = (element as HTMLInputElement).value;
          document.body.append(measure);
          const textWidth = measure.getBoundingClientRect().width;
          measure.remove();

          return {
            availableWidth:
              element.clientWidth -
              parseFloat(styles.paddingLeft) -
              parseFloat(styles.paddingRight),
            textWidth,
            width: element.getBoundingClientRect().width,
          };
        });

        expect(dimensions.availableWidth).toBeGreaterThanOrEqual(
          dimensions.textWidth + 2,
        );
        initialWidth ??= dimensions.width;
        expect(dimensions.width).toBeCloseTo(initialWidth, 1);
      }
    }

    const pageWidth = await page.evaluate(() => ({
      available: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.available);

    await page.getByRole("button", { name: "Increase BPM by 1" }).click();
    await expect(input).toHaveValue("220");
    await page.getByRole("button", { name: "Decrease BPM by 1" }).click();
    await expect(input).toHaveValue("219");
  });
}
