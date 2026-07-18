import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { DrumPatternGrid } from "@/components/editor/drum-pattern-grid";
import { createDefaultPatternDraft } from "@/lib/drum-pattern-editor";
import type { CustomDrumPattern } from "@/types/persistence";

function GridHarness() {
  const [pattern, setPattern] = useState<CustomDrumPattern>(() =>
    createDefaultPatternDraft([], {
      now: () => "2026-07-18T12:00:00.000Z",
    }),
  );
  return (
    <DrumPatternGrid
      activeStep={null}
      onChange={setPattern}
      pattern={pattern}
    />
  );
}

describe("drum pattern grid", () => {
  it("cycles a touch-safe native cell button with keyboard support", async () => {
    const user = userEvent.setup();
    render(<GridHarness />);
    const empty = screen.getByRole("button", {
      name: "Kick, step 1, empty",
    });
    empty.focus();

    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", {
        name: /Kick, step 1, 70 percent velocity/,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: /85 percent velocity/ }),
    ).toBeInTheDocument();
  });

  it("opens advanced properties from a context menu and applies them", async () => {
    const user = userEvent.setup();
    render(<GridHarness />);
    const cell = screen.getByRole("button", {
      name: "Snare, step 3, empty",
    });

    fireEvent.contextMenu(cell);
    expect(
      screen.getByRole("dialog", { name: "Snare - step 3" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("slider", { name: /Probability/ }), {
      target: { value: "0.5" },
    });
    await user.click(screen.getByRole("button", { name: "Apply hit" }));

    expect(
      screen.getByRole("button", {
        name: /Snare, step 3, 70 percent velocity, 50 percent probability/,
      }),
    ).toBeInTheDocument();
  });

  it("clears a populated instrument row", async () => {
    const user = userEvent.setup();
    render(<GridHarness />);
    await user.click(
      screen.getByRole("button", { name: "Kick, step 1, empty" }),
    );
    await user.click(screen.getByRole("button", { name: "Clear Kick row" }));
    expect(
      screen.getByRole("button", { name: "Kick, step 1, empty" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
