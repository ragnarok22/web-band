import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import * as buttonModule from "@/components/ui/button";

const { Button } = buttonModule;

describe("button", () => {
  it("exports only the component to preserve its Fast Refresh boundary", () => {
    expect(Object.keys(buttonModule)).toEqual(["Button"]);
  });

  it("keeps the default variant, size, and slot", () => {
    render(<Button>Play</Button>);

    const button = screen.getByRole("button", { name: "Play" });
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveClass("bg-primary", "text-primary-foreground", "h-8");
  });

  it("keeps custom variants, sizes, classes, and forwarded props", () => {
    render(
      <Button
        aria-label="More options"
        className="custom-button"
        size="icon-sm"
        type="submit"
        variant="outline"
      >
        More
      </Button>,
    );

    const button = screen.getByRole("button", { name: "More options" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("border-border", "size-7", "custom-button");
    expect(button).not.toHaveClass("bg-primary", "h-8");
  });

  it("keeps click handling and disabled behavior", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Play</Button>);

    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(onClick).toHaveBeenCalledOnce();

    rerender(
      <Button disabled onClick={onClick}>
        Play
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
