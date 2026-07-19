import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AboutScreen } from "@/components/about/about-screen";

describe("about screen", () => {
  it("explains the product boundaries and provides practice actions", () => {
    render(<AboutScreen />);

    expect(
      screen.getByRole("heading", { name: "A drum room without the room." }),
    ).toBeInTheDocument();
    expect(screen.getByText("0", { selector: "dt" })).toBeInTheDocument();
    expect(screen.getByText("audio files")).toBeInTheDocument();
    expect(screen.getByText(/No cloud account required/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Start practicing/ }),
    ).toHaveAttribute("href", "/practice");
    expect(
      screen.getByRole("link", { name: "Explore grooves" }),
    ).toHaveAttribute("href", "/patterns");
  });
});
