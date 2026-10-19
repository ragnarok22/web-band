import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import * as toggleModule from "@/components/ui/toggle";

const { Toggle } = toggleModule;

describe("toggle", () => {
  it("exports only the component to preserve its Fast Refresh boundary", () => {
    expect(Object.keys(toggleModule)).toEqual(["Toggle"]);
  });

  it("keeps the default variant, size, and slot", () => {
    render(<Toggle>Loop</Toggle>);

    const toggle = screen.getByRole("button", { name: "Loop" });
    expect(toggle).toHaveAttribute("data-slot", "toggle");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveClass("bg-transparent", "h-8", "min-w-8");
  });

  it("keeps custom variants, sizes, and classes", () => {
    render(
      <Toggle className="custom-toggle" size="sm" variant="outline">
        Loop
      </Toggle>,
    );

    const toggle = screen.getByRole("button", { name: "Loop" });
    expect(toggle).toHaveClass("border-input", "h-7", "custom-toggle");
    expect(toggle).not.toHaveClass("h-8");
  });

  it("keeps pressed state changes and disabled behavior", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    const { rerender } = render(
      <Toggle onPressedChange={onPressedChange}>Loop</Toggle>,
    );

    await user.click(screen.getByRole("button", { name: "Loop" }));

    expect(screen.getByRole("button", { name: "Loop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(onPressedChange).toHaveBeenCalledOnce();
    expect(onPressedChange.mock.calls[0][0]).toBe(true);

    rerender(
      <Toggle disabled onPressedChange={onPressedChange}>
        Loop
      </Toggle>,
    );

    expect(screen.getByRole("button", { name: "Loop" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Loop" }));
    expect(onPressedChange).toHaveBeenCalledOnce();
  });
});
