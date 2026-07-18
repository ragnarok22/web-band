import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { PracticeModeSelector } from "@/components/practice/practice-mode-selector";
import type { PracticeMode } from "@/types/practice";

function SelectorHarness() {
  const [mode, setMode] = useState<PracticeMode>("drums");
  return (
    <PracticeModeSelector disabled={false} mode={mode} onChange={setMode} />
  );
}

describe("practice mode selector", () => {
  it("exposes four radio choices and updates the selected mode", async () => {
    const user = userEvent.setup();
    render(<SelectorHarness />);

    expect(
      screen.getByRole("radiogroup", { name: "Practice mode" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: /Drums/ })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: /Tempo/ }));
    expect(screen.getByRole("radio", { name: /Tempo/ })).toBeChecked();
  });

  it("disables every mode while a session is active", () => {
    const onChange = vi.fn();
    render(<PracticeModeSelector disabled mode="chords" onChange={onChange} />);

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
    expect(screen.getByText(/Stop the current session/)).toBeInTheDocument();
  });

  it("keeps choices in two usable columns inside the settings sidebar", () => {
    render(<SelectorHarness />);

    const choices = screen
      .getByRole("radiogroup", { name: "Practice mode" })
      .querySelector(".grid");
    expect(choices).toHaveClass("grid-cols-2");
    expect(choices).not.toHaveClass("lg:grid-cols-4");
  });
});
