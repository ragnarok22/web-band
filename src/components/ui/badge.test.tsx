import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import * as badgeModule from "@/components/ui/badge";

const { Badge } = badgeModule;

describe("badge", () => {
  it("exports only the component to preserve its Fast Refresh boundary", () => {
    expect(Object.keys(badgeModule)).toEqual(["Badge"]);
  });

  it("keeps the default variant and slot", () => {
    render(<Badge>Ready</Badge>);

    const badge = screen.getByText("Ready");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveAttribute("data-slot", "badge");
    expect(badge).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("keeps custom variants, classes, and render props", () => {
    render(
      <Badge
        className="custom-badge"
        render={<a href="#details" />}
        variant="secondary"
      >
        Details
      </Badge>,
    );

    const badge = screen.getByRole("link", { name: "Details" });
    expect(badge).toHaveAttribute("href", "#details");
    expect(badge).toHaveClass("bg-secondary", "custom-badge");
    expect(badge).not.toHaveClass("bg-primary");
  });
});
