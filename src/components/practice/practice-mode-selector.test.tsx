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

  it("disables every mode while a session is active", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PracticeModeSelector disabled mode="chords" onChange={onChange} />);

    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveAttribute("aria-disabled", "true");
    }
    expect(screen.getByText(/Stop the current session/)).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Practice mode" }),
    ).toHaveAccessibleDescription(
      "Stop the current session to change practice mode.",
    );

    await user.click(screen.getByText("Tempo", { exact: true }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Chords" })).toBeChecked();
  });

  it("describes each mode without adding the description to its name", () => {
    render(<SelectorHarness />);

    expect(
      screen.getByRole("radio", { name: "Drums" }),
    ).toHaveAccessibleDescription("Play the groove without added cues.");
    expect(
      screen.getByRole("radio", { name: "Tempo" }),
    ).toHaveAccessibleDescription("Build speed in measured steps.");
    expect(
      screen.getByRole("radio", { name: "Chords" }),
    ).toHaveAccessibleDescription("Follow a timed chord progression.");
    expect(
      screen.getByRole("radio", { name: "Strumming" }),
    ).toHaveAccessibleDescription("Practice a complete strum pattern.");
  });

  it("selects a mode from its card text", async () => {
    const user = userEvent.setup();
    render(<SelectorHarness />);

    await user.click(screen.getByText("Strumming", { exact: true }));
    expect(screen.getByRole("radio", { name: "Strumming" })).toBeChecked();
  });

  it("supports arrow-key selection from the selected mode", async () => {
    const user = userEvent.setup();
    render(<SelectorHarness />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "Drums" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Strumming" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Strumming" })).toBeChecked();
  });

  it("reserves a disabled, UI-only Metronome without changing modes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PracticeModeSelector
        disabled={false}
        mode="drums"
        onChange={onChange}
      />,
    );
    const metronome = screen.getByRole("button", {
      name: "Metronome — Coming soon",
    });
    expect(metronome).toBeDisabled();
    await user.click(metronome);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Drums" })).toBeChecked();
  });

  it("keeps description references unique across selectors", () => {
    render(
      <>
        <SelectorHarness />
        <SelectorHarness />
      </>,
    );

    const descriptions = screen
      .getAllByRole("radio")
      .map((radio) => radio.getAttribute("aria-describedby"));
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});
