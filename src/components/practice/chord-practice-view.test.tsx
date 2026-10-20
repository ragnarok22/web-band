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

function progressForChord(index: number) {
  return within(screen.getAllByRole("listitem")[index]).getByRole(
    "progressbar",
  );
}

function beatStates() {
  return Array.from(
    screen.getByRole("img", { name: "Chord beat countdown" }).children,
  ).map((dot) => dot.getAttribute("data-state"));
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
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "25");
    publish(configuration, 12);
    expect(screen.getByText("Change in 1 beat")).toBeVisible();
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "75");
    publish(configuration, 16);
    expect(screen.getByText("Change in 4 beats")).toBeVisible();
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "100");
    expect(progressForChord(1)).toHaveAttribute("aria-valuenow", "0");
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
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "100");
    let steps = within(
      screen.getByRole("list", { name: "Chord progression" }),
    ).getAllByRole("listitem");
    expect(steps[0]).toHaveAttribute("data-state", "next");
    expect(screen.getByRole("group", { name: "Next chord" })).toHaveTextContent(
      "G",
    );
    publish(configuration, 64);
    for (const progress of screen.getAllByRole("progressbar")) {
      expect(progress).toHaveAttribute("aria-valuenow", "0");
    }
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
    expect(
      screen.queryByRole("img", { name: "Chord beat countdown" }),
    ).not.toBeInTheDocument();
    for (const progress of screen.getAllByRole("progressbar")) {
      expect(progress).toHaveAttribute("aria-valuenow", "100");
    }
  });

  it("hides both countdown presentations when disabled, even with a retained countdown", () => {
    publish(configuration, 4);
    render(display({ ...configuration, showCountdown: false }));
    expect(screen.queryByText(/Change in/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Chord beat countdown" }),
    ).not.toBeInTheDocument();
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "25");
    expect(screen.getByTestId("current-chord")).toHaveTextContent("G");
  });

  it("shows the snapshot measure without a countdown, then prioritizes completion", () => {
    const config = { ...configuration, repeat: false, showCountdown: false };
    act(() => {
      guidanceTimeline.publish({
        absoluteSixteenth: 32,
        elapsedSeconds: 4,
        measure: 3,
        mode: "chords",
        position: getChordTrainerPosition(config, meter, 32),
      });
    });
    render(display(config));
    expect(screen.getByText("Measure 3")).toBeVisible();
    expect(
      screen.queryByRole("img", { name: "Chord beat countdown" }),
    ).toBeNull();

    publish(config, 64);
    expect(screen.getByText("Progression complete")).toBeVisible();
    expect(screen.queryByText(/^Measure /)).toBeNull();
    expect(screen.getByRole("group", { name: "Next chord" })).toHaveTextContent(
      "Finish",
    );
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

  it.each([0, 1, 2, 3])(
    "shows completed, current, and upcoming dots on beat %i in 4/4",
    (beat) => {
      render(display());
      publish(configuration, beat * 4);
      expect(beatStates()).toEqual(
        Array.from({ length: 4 }, (_, index) =>
          index < beat ? "completed" : index === beat ? "current" : "upcoming",
        ),
      );
      expect(
        screen.getByText(
          `Change in ${4 - beat} ${beat === 3 ? "beat" : "beats"}`,
        ),
      ).toBeVisible();
    },
  );

  it.each([
    [{ numerator: 3, denominator: 4 }, 8, 3, 2],
    [{ numerator: 6, denominator: 8 }, 10, 6, 5],
    [{ numerator: 12, denominator: 8 }, 14, 12, 7],
  ] as const)(
    "uses %o for the countdown dots",
    (timeSignature, at, count, currentBeat) => {
      render(display(configuration, timeSignature));
      publish(configuration, at, timeSignature);
      const states = beatStates();
      expect(states).toHaveLength(count);
      expect(states[currentBeat]).toBe("current");
      expect(states.filter((state) => state === "completed")).toHaveLength(
        currentBeat,
      );
    },
  );

  it("restarts multi-bar dots each bar while preserving the overall chord countdown and progress", () => {
    const config: ChordTrainerConfiguration = {
      ...configuration,
      progression: {
        ...gDEmCProgression,
        steps: [{ ...gDEmCProgression.steps[0]!, duration: 2 }],
      },
    };
    render(display(config));
    publish(config, 12);
    expect(beatStates()).toEqual([
      "completed",
      "completed",
      "completed",
      "current",
    ]);
    expect(screen.getByText("Change in 5 beats")).toBeVisible();
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "38");
    publish(config, 16);
    expect(beatStates()).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    expect(screen.getByText("Change in 4 beats")).toBeVisible();
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "50");
    publish(config, 32);
    expect(beatStates()).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "0");
  });

  it.each([2, 7])(
    "does not show nonexistent beats at the end of a %i-beat chord",
    (beats) => {
      const config: ChordTrainerConfiguration = {
        ...configuration,
        progression: {
          ...gDEmCProgression,
          steps: [
            {
              chord: "G",
              duration: beats,
              durationUnit: "beats",
              id: "beat-hold",
            },
            gDEmCProgression.steps[1]!,
          ],
        },
      };
      render(display(config));
      publish(config, (beats - 1) * 4);
      expect(beatStates()).toHaveLength(beats % 4);
      expect(beatStates().at(-1)).toBe("current");
      expect(screen.getByText("Change in 1 beat")).toBeVisible();
      publish(config, beats * 4);
      expect(screen.getByTestId("current-chord")).toHaveTextContent("D");
      expect(beatStates()).toEqual([
        "current",
        "upcoming",
        "upcoming",
        "upcoming",
      ]);
      expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "100");
      expect(progressForChord(1)).toHaveAttribute("aria-valuenow", "0");
    },
  );

  it("keeps dot and card progress fixed between guidance frames, and resets with the timeline on Stop", () => {
    const { rerender } = render(display());
    publish(configuration, 6);
    const pausedStates = beatStates();
    rerender(
      <GuidedPracticeDisplay
        configuration={{ mode: "chords", chordTrainer: configuration }}
        status="paused"
        timeSignature={meter}
      />,
    );
    expect(beatStates()).toEqual(pausedStates);
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "38");
    rerender(display());
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "38");
    publish(configuration, 8);
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "50");
    act(() => guidanceTimeline.reset());
    expect(beatStates()).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    for (const progress of screen.getAllByRole("progressbar"))
      expect(progress).toHaveAttribute("aria-valuenow", "0");
  });

  it("resets a single-chord loop without animating the previous cycle backward", () => {
    const config: ChordTrainerConfiguration = {
      ...configuration,
      progression: { ...gDEmCProgression, steps: [gDEmCProgression.steps[0]!] },
    };
    render(display(config));
    publish(config, 15);
    const fill = progressForChord(0).firstElementChild;
    expect(fill).toHaveStyle({ transform: "scaleX(0.9375)" });
    publish(config, 16);
    expect(progressForChord(0)).toHaveAttribute("aria-valuenow", "0");
    expect(progressForChord(0).firstElementChild).not.toBe(fill);
    expect(progressForChord(0).firstElementChild).toHaveStyle({
      transform: "scaleX(0)",
    });
  });

  it("does not replace the dot row between subdivision-only updates", () => {
    render(display());
    const row = screen.getByRole("img", { name: "Chord beat countdown" });
    const dots = Array.from(row.children);
    publish(configuration, 1);
    expect(Array.from(row.children)).toEqual(dots);
    expect(beatStates()).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
    expect(progressForChord(0).firstElementChild).toHaveStyle({
      transform: "scaleX(0.0625)",
    });
    publish(configuration, 4);
    expect(
      screen.getByRole("img", { name: "Chord beat countdown" }),
    ).toHaveAccessibleDescription(
      "Beat 2 of 4 in this chord's current beat group.",
    );
    publish(configuration, 16);
    expect(screen.getByRole("img", { name: "Chord beat countdown" })).toBe(row);
    expect(beatStates()).toEqual([
      "current",
      "upcoming",
      "upcoming",
      "upcoming",
    ]);
  });
});
