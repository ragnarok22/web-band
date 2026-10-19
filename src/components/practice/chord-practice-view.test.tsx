import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { guidanceTimeline } from "@/audio/guidance-timeline";
import { GuidedPracticeDisplay } from "@/components/practice/guided-practice-display";
import { gDEmCProgression } from "@/data/chord-progressions";
import { getChordTrainerPosition } from "@/lib/guided-practice";
import { renderWithMotion as render } from "@/test/render-with-motion";
import type { TimeSignature } from "@/types/pattern";
import type { ChordTrainerConfiguration } from "@/types/practice";

const meter = { denominator: 4, numerator: 4 };
const configuration: ChordTrainerConfiguration = {
  progression: gDEmCProgression,
  repeat: true,
  showCountdown: true,
};

function publish(
  config: ChordTrainerConfiguration,
  absoluteSixteenth: number,
  timeSignature: TimeSignature = meter,
) {
  act(() => {
    guidanceTimeline.publish({
      absoluteSixteenth,
      elapsedSeconds: absoluteSixteenth / 8,
      measure: 1,
      mode: "chords",
      position: getChordTrainerPosition(
        config,
        timeSignature,
        absoluteSixteenth,
      ),
    });
  });
}

function display(config = configuration, timeSignature = meter) {
  return (
    <GuidedPracticeDisplay
      configuration={{ mode: "chords", chordTrainer: config }}
      status="playing"
      timeSignature={timeSignature}
    />
  );
}

describe("chord practice guidance", () => {
  beforeEach(() => guidanceTimeline.begin());
  afterEach(() => guidanceTimeline.reset());

  it("shows one ordered timeline with current, next, completed, and remaining steps", () => {
    render(display());
    const sequence = screen.getByRole("list", { name: "Chord progression" });
    expect(
      screen.getAllByRole("list", { name: "Chord progression" }),
    ).toHaveLength(1);
    expect(
      within(sequence)
        .getAllByRole("listitem")
        .map((step) => step.dataset.chord),
    ).toEqual(["G", "D", "Em", "C"]);
    publish(configuration, 16);
    const steps = within(sequence).getAllByRole("listitem");
    expect(steps.map((step) => step.dataset.state)).toEqual([
      "completed",
      "current",
      "next",
      "remaining",
    ]);
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(screen.getByTestId("current-chord")).toHaveTextContent(/^D$/);
    expect(screen.getByRole("group", { name: "Next chord" })).toHaveTextContent(
      "Em",
    );
    expect(screen.getByText("Chord 2 of 4")).toBeVisible();
  });

  it("uses audio guidance for the numerical countdown and progress, including retained frames", () => {
    publish(configuration, 4);
    render(display());
    expect(screen.getByText("Change in 3 beats")).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Current chord progress" }),
    ).toHaveValue(4);
    publish(configuration, 12);
    expect(screen.getByText("Change in 1 beat")).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Current chord progress" }),
    ).toHaveValue(12);
    publish(configuration, 16);
    expect(screen.getByText("Change in 4 beats")).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Current chord progress" }),
    ).toHaveValue(0);
  });

  it("handles mixed beat and bar durations in the active meter", () => {
    const config: ChordTrainerConfiguration = {
      ...configuration,
      progression: {
        ...gDEmCProgression,
        steps: [
          { chord: "Am", duration: 1, durationUnit: "beats", id: "one-beat" },
          { chord: "F", duration: 2, durationUnit: "beats", id: "two-beats" },
          { chord: "C", duration: 1, durationUnit: "measures", id: "one-bar" },
          { chord: "G", duration: 2, durationUnit: "measures", id: "two-bars" },
        ],
      },
    };
    const compoundMeter = { denominator: 8, numerator: 6 };
    render(display(config, compoundMeter));
    const sequence = within(
      screen.getByRole("list", { name: "Chord progression" }),
    );
    for (const duration of ["1 beat", "2 beats", "1 bar", "2 bars"]) {
      expect(sequence.getByText(duration)).toBeVisible();
    }
    expect(screen.getByText("Change in 1 beat")).toBeVisible();
    publish(config, 6, compoundMeter);
    expect(screen.getByTestId("current-chord")).toHaveTextContent(/^C$/);
    expect(screen.getByText("Change in 6 beats")).toBeVisible();
    publish(config, 18, compoundMeter);
    expect(screen.getByText("Change in 12 beats")).toBeVisible();
  });

  it("wraps the next chord and resets completed steps for each repeat", () => {
    render(display());
    publish(configuration, 48);
    let steps = within(
      screen.getByRole("list", { name: "Chord progression" }),
    ).getAllByRole("listitem");
    expect(steps[0]).toHaveAttribute("data-state", "next");
    expect(screen.getByRole("group", { name: "Next chord" })).toHaveTextContent(
      "G",
    );
    publish(configuration, 64);
    steps = within(
      screen.getByRole("list", { name: "Chord progression" }),
    ).getAllByRole("listitem");
    expect(steps.map((step) => step.dataset.state)).toEqual([
      "current",
      "next",
      "remaining",
      "remaining",
    ]);
  });

  it("shows the final chord and completion without inventing an upcoming step", () => {
    const config = { ...configuration, repeat: false };
    render(display(config));
    publish(config, 60);
    expect(screen.getByRole("group", { name: "Next chord" })).toHaveTextContent(
      "Finish",
    );
    expect(screen.getByText("Finish in 1 beat")).toBeVisible();
    expect(document.querySelector('[data-state="next"]')).toBeNull();
    publish(config, 64);
    expect(screen.getByTestId("current-chord")).toHaveTextContent("Complete");
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
    expect(document.querySelectorAll('[data-state="completed"]')).toHaveLength(
      4,
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("hides both countdown presentations when disabled, even with a retained countdown", () => {
    publish(configuration, 4);
    render(display({ ...configuration, showCountdown: false }));
    expect(screen.queryByText(/Change in/)).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByTestId("current-chord")).toHaveTextContent("G");
  });

  it("keeps repeated chord names distinct by step ID rather than chord symbol", () => {
    const config: ChordTrainerConfiguration = {
      ...configuration,
      progression: {
        ...gDEmCProgression,
        steps: [
          { chord: "G", duration: 1, durationUnit: "beats", id: "first-g" },
          { chord: "G", duration: 1, durationUnit: "beats", id: "second-g" },
        ],
      },
    };
    render(display(config));
    publish(config, 4);
    const steps = screen.getAllByRole("listitem");
    expect(steps[0]).toHaveAttribute("data-state", "next");
    expect(steps[1]).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Chord 2 of 2")).toBeVisible();
  });

  it("gives a single-step loop current precedence", () => {
    const config = {
      ...configuration,
      progression: {
        ...gDEmCProgression,
        steps: [
          {
            chord: "G",
            duration: 1,
            durationUnit: "measures" as const,
            id: "only-g",
          },
        ],
      },
    };
    render(display(config));
    publish(config, 16);
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(document.querySelector('[data-state="next"]')).toBeNull();
    expect(screen.getByRole("group", { name: "Next chord" })).toHaveTextContent(
      "G",
    );
  });
});
