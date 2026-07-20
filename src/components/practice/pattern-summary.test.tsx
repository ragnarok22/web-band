import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PatternSummary } from "@/components/practice/pattern-summary";
import { builtInPatterns } from "@/data/patterns";
import { renderWithMotion as render } from "@/test/render-with-motion";

describe("pattern summary", () => {
  it("animates committed pattern content without replacing the focused selector", () => {
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
    const selector = screen.getByRole("combobox", { name: "Current pattern" });
    selector.focus();

    rerender(
      <PatternSummary
        {...props}
        pattern={first}
        pendingPatternId={second.id}
      />,
    );
    expect(screen.getByRole("heading", { name: first.name })).toBeVisible();
    expect(selector).toHaveValue(second.id);

    rerender(
      <PatternSummary {...props} pattern={second} pendingPatternId={null} />,
    );
    expect(screen.getByRole("heading", { name: second.name })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Current pattern" })).toBe(
      selector,
    );
    expect(selector).toHaveFocus();
  });
});
