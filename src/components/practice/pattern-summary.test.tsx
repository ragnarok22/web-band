import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PatternSummary } from "@/components/practice/pattern-summary";
import { builtInPatterns } from "@/data/patterns";
import { renderWithMotion as render } from "@/test/render-with-motion";

describe("pattern summary", () => {
  it("updates committed pattern content without replacing the focused picker", async () => {
    const user = userEvent.setup();
    const first = builtInPatterns[0]!;
    const second = builtInPatterns[1]!;
    const props = {
      immediatePatternSwitch: false,
      onImmediatePatternSwitchChange: vi.fn(),
      onPatternChange: vi.fn(),
      patterns: [...builtInPatterns],
      swing: 0,
    };
    const { rerender } = render(
      <PatternSummary {...props} pattern={first} pendingPatternId={null} />,
    );
    await user.click(screen.getByRole("button", { name: "Change Pattern" }));
    const selector = screen.getByRole("combobox", { name: "Current pattern" });
    selector.focus();

    rerender(
      <PatternSummary
        {...props}
        pattern={first}
        pendingPatternId={second.id}
      />,
    );
    expect(screen.getByText(first.name, { selector: "h2" })).toBeVisible();
    expect(selector).toHaveValue(
      `${second.name} - ${second.timeSignature.numerator}/${second.timeSignature.denominator}`,
    );

    rerender(
      <PatternSummary {...props} pattern={second} pendingPatternId={null} />,
    );
    expect(screen.getByText(second.name, { selector: "h2" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Current pattern" })).toBe(
      selector,
    );
    expect(selector).toHaveFocus();
  });

  it("searches the library and selects a pattern without changing the active heading prematurely", async () => {
    const user = userEvent.setup();
    const onPatternChange = vi.fn();
    const first = builtInPatterns[0]!;
    render(
      <PatternSummary
        immediatePatternSwitch={false}
        onImmediatePatternSwitchChange={vi.fn()}
        onPatternChange={onPatternChange}
        patterns={[...builtInPatterns]}
        pattern={first}
        pendingPatternId={null}
        swing={0}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Change Pattern" }));
    const input = screen.getByRole("combobox", { name: "Current pattern" });
    await user.clear(input);
    await user.type(input, "One Drop");
    const option = await screen.findByRole("option", {
      name: "One Drop - 4/4",
    });
    expect(
      screen.queryByRole("option", {
        name: `${first.name} - 4/4`,
      }),
    ).not.toBeInTheDocument();
    await user.click(option);
    expect(onPatternChange).toHaveBeenCalledWith("one-drop");
    expect(screen.getByRole("heading", { name: first.name })).toBeVisible();
  });

  it("shows an empty search and supports keyboard selection", async () => {
    const user = userEvent.setup();
    const onPatternChange = vi.fn();
    render(
      <PatternSummary
        immediatePatternSwitch={false}
        onImmediatePatternSwitchChange={vi.fn()}
        onPatternChange={onPatternChange}
        patterns={[...builtInPatterns]}
        pattern={builtInPatterns[0]!}
        pendingPatternId={null}
        swing={0}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Change Pattern" }));
    const input = screen.getByRole("combobox", { name: "Current pattern" });
    await user.clear(input);
    await user.type(input, "no-such-pattern-xyz");
    expect(await screen.findByText("No patterns found.")).toBeVisible();
    expect(onPatternChange).not.toHaveBeenCalled();
    await user.clear(input);
    await user.type(input, "One Drop");
    await screen.findByRole("option", { name: "One Drop - 4/4" });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onPatternChange).toHaveBeenCalledWith("one-drop");
  });
});
