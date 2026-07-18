import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { guidanceTimeline } from "@/audio/guidance-timeline";
import { GuidedPracticeDisplay } from "@/components/practice/guided-practice-display";
import { gDEmCProgression } from "@/data/chord-progressions";
import { downDownUpUpDownUpPattern } from "@/data/strumming-patterns";

describe("guided practice display", () => {
  beforeEach(() => guidanceTimeline.reset());
  afterEach(() => guidanceTimeline.reset());

  it("reads a retained snapshot immediately and shows current and next guidance", () => {
    guidanceTimeline.begin();
    guidanceTimeline.publish({
      absoluteSixteenth: 4,
      elapsedSeconds: 1.25,
      measure: 1,
      mode: "chords",
      position: {
        countdown: 3,
        currentChord: "D",
        currentStepId: "g-d-em-c-d",
        currentStepIndex: 1,
        cycle: 0,
        isComplete: false,
        nextChord: "Em",
        nextStepId: "g-d-em-c-em",
        sixteenthsIntoStep: 0,
        sixteenthsRemaining: 12,
      },
    });

    render(
      <GuidedPracticeDisplay
        configuration={{
          chordTrainer: {
            progression: gDEmCProgression,
            repeat: true,
            showCountdown: true,
          },
          mode: "chords",
        }}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );

    expect(
      screen.getByText("Current chord").nextElementSibling,
    ).toHaveTextContent("D");
    expect(screen.getByText("Next chord").nextElementSibling).toHaveTextContent(
      "Em",
    );
    expect(screen.getByText("Change in 3 beats")).toBeInTheDocument();
  });

  it("shows tempo progress from timeline frames", () => {
    guidanceTimeline.begin();
    guidanceTimeline.publish({
      absoluteSixteenth: 16,
      elapsedSeconds: 8,
      measure: 2,
      mode: "tempoTrainer",
      position: {
        completedIntervals: 2,
        currentBpm: 90,
        isAtTarget: false,
        measuresUntilChange: 2,
        nextBpm: 95,
        progress: 0.25,
        secondsUntilChange: null,
        shouldStop: false,
      },
    });
    render(
      <GuidedPracticeDisplay
        configuration={{
          mode: "tempoTrainer",
          tempoTrainer: {
            endBpm: 120,
            increment: 5,
            interval: { measures: 4, type: "measures" },
            resetToStartingBpmOnStop: true,
            startBpm: 80,
            stopAtTarget: true,
          },
        }}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );

    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Overall tempo progress" }),
    ).toHaveValue(25);
  });

  it("updates symbolic strum cues without creating a live region", () => {
    const { container } = render(
      <GuidedPracticeDisplay
        configuration={{
          mode: "strumming",
          strummingPattern: downDownUpUpDownUpPattern,
        }}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );

    expect(screen.getByText("Current strum")).toBeInTheDocument();
    expect(screen.getAllByText("Down")).not.toHaveLength(0);
    expect(container.querySelector("[aria-live]")).toBeNull();

    act(() => {
      guidanceTimeline.begin();
      guidanceTimeline.publish({
        absoluteSixteenth: 3,
        elapsedSeconds: 0.5,
        measure: 1,
        mode: "strumming",
        position: {
          accent: false,
          currentAction: "up",
          currentStepId: "step-up",
          isStepBoundary: true,
          nextAction: "rest",
          nextStepId: "step-rest",
          stepIndex: 3,
        },
      });
    });

    expect(screen.getByText("Up")).toBeInTheDocument();
    expect(screen.getByText("Rest")).toBeInTheDocument();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  it("converts an idle measure duration to beats in the active meter", () => {
    render(
      <GuidedPracticeDisplay
        configuration={{
          chordTrainer: {
            progression: gDEmCProgression,
            repeat: true,
            showCountdown: true,
          },
          mode: "chords",
        }}
        timeSignature={{ denominator: 8, numerator: 6 }}
      />,
    );

    expect(screen.getByText("Change in 6 beats")).toBeInTheDocument();
  });
});
