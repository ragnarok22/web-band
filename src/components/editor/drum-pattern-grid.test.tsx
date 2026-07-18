import { fireEvent, render, screen, within } from "@testing-library/react";
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

function ResizableGridHarness() {
  const [pattern, setPattern] = useState<CustomDrumPattern>(() => ({
    ...createDefaultPatternDraft([], {
      now: () => "2026-07-18T12:00:00.000Z",
    }),
    bars: 2,
  }));
  return (
    <>
      <button
        onClick={() =>
          setPattern((current) => ({
            ...current,
            bars: 1,
            hits: current.hits.filter(({ step }) => step < 8),
            subdivision: 8,
          }))
        }
        type="button"
      >
        Shrink grid
      </button>
      <DrumPatternGrid
        activeStep={null}
        onChange={setPattern}
        pattern={pattern}
      />
    </>
  );
}

describe("drum pattern grid", () => {
  it("includes playhead state in cell names without a live region", () => {
    const pattern = createDefaultPatternDraft([], {
      now: () => "2026-07-18T12:00:00.000Z",
    });
    render(
      <DrumPatternGrid
        activeStep={0}
        onChange={() => undefined}
        pattern={pattern}
      />,
    );

    const cell = screen.getByRole("button", {
      name: /Kick, measure 1, column 1,.*playhead active/,
    });
    expect(cell.closest("[aria-live]")).toBeNull();
  });

  it("cycles a touch-safe native cell button with keyboard support", async () => {
    const user = userEvent.setup();
    render(<GridHarness />);
    const empty = screen.getByRole("button", {
      name: /Kick, measure 1, column 1,.*empty/,
    });
    empty.focus();

    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", {
        name: /Kick, measure 1, column 1,.*70 percent velocity/,
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
      name: /Snare, measure 1, column 3,.*empty/,
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
        name: /Snare, measure 1, column 3,.*70 percent velocity, 50 percent probability/,
      }),
    ).toBeInTheDocument();
  });

  it("clears a populated instrument row", async () => {
    const user = userEvent.setup();
    render(<GridHarness />);
    await user.click(
      screen.getByRole("button", {
        name: /Kick, measure 1, column 1,.*empty/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Clear Kick row" }));
    expect(
      screen.getByRole("button", {
        name: /Kick, measure 1, column 1,.*empty/,
      }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("exposes grid semantics with one roving cell tab stop", async () => {
    const user = userEvent.setup();
    render(<GridHarness />);
    const grid = screen.getByRole("grid", { name: "Drum pattern steps" });
    expect(within(grid).getAllByRole("row")).toHaveLength(12);
    expect(within(grid).getAllByRole("columnheader").length).toBeGreaterThan(1);
    expect(within(grid).getAllByRole("gridcell").length).toBeGreaterThan(1);

    const cells = within(grid)
      .getAllByRole("gridcell")
      .map((cell) => cell.querySelector("button")!);
    expect(cells.filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
    const kick = within(grid).getByRole("button", {
      name: /Kick, measure 1, column 1,.*playhead inactive/,
    });
    kick.focus();
    await user.keyboard("{ArrowRight}");
    expect(
      within(grid).getByRole("button", {
        name: /Kick, measure 1, column 2/,
      }),
    ).toHaveFocus();
    await user.keyboard("{End}");
    expect(
      within(grid).getByRole("button", {
        name: /Kick, measure 1, column 16,/,
      }),
    ).toHaveFocus();
    await user.keyboard("{Home}");
    expect(kick).toHaveFocus();
  });

  it("resets measure and cell addresses that fall outside a shrunken grid", async () => {
    const user = userEvent.setup();
    render(<ResizableGridHarness />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Target measure" }),
      "1",
    );
    const staleCell = screen.getByRole("button", {
      name: /Snare, measure 2, column 16,.*empty/,
    });
    fireEvent.contextMenu(staleCell);
    expect(
      screen.getByRole("dialog", { name: "Snare - step 32" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Shrink grid" }));

    expect(
      screen.getByRole("combobox", { name: "Target measure" }),
    ).toHaveValue("0");
    expect(screen.queryByRole("dialog", { name: /Snare - step/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Edit selected hit properties" }),
    ).toBeDisabled();
  });
});
