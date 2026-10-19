import {
  engine,
  setupPracticeScreenTests,
} from "./practice-screen.test-support";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PracticeScreen } from "@/components/practice/practice-screen";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { useAudioStore } from "@/stores/audio-store";
import { renderWithMotion as render } from "@/test/render-with-motion";
import { metronomeTimeline } from "@/audio/metronome-timeline";

describe("Metronome in the practice room", () => {
  setupPracticeScreenTests();

  it("enables the fifth mode without drum controls or a pattern in playback", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    await user.click(screen.getByRole("radio", { name: "Metronome" }));
    expect(screen.queryByRole("region", { name: "Current groove" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Metronome" })).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Time signature" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Controls" }));
    expect(
      screen.getByRole("slider", { name: "Metronome volume" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Drum Kit" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Hide controls" }));
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(engine.play).toHaveBeenCalledWith(
      expect.objectContaining({
        guidedPractice: expect.objectContaining({ mode: "metronome" }),
      }),
    );
    expect(engine.play).not.toHaveBeenCalledWith(
      expect.objectContaining({ pattern: expect.anything() }),
    );
  });

  it("edits subdivision, audio, training, and persistent accents", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.getState().setMode("metronome");
    render(<PracticeScreen />);
    await user.click(
      screen.getByRole("radio", { name: "3 — Eighth-note triplets" }),
    );
    await user.click(screen.getByRole("radio", { name: "Pulse Only" }));
    await user.click(screen.getByRole("button", { name: "Accent beat 3" }));
    expect(useGuidedPracticeStore.getState().metronome).toMatchObject({
      subdivision: 3,
      subdivisionAudioMode: "pulse-only",
      accentPattern: [true, false, true, false],
    });
    await user.click(screen.getByRole("radio", { name: "Progressive" }));
    expect(screen.getByText("Stage 1 of 4")).toBeVisible();
    expect(
      screen.getByRole("radio", { name: "3 — Eighth-note triplets" }),
    ).toHaveAttribute("aria-disabled", "true");
    act(() => useGuidedPracticeStore.getState().hydrate());
    expect(useGuidedPracticeStore.getState().metronome.trainingMode).toBe(
      "progressive",
    );
  });

  it("shows compound grouping and metronome-specific Focus content", async () => {
    const user = userEvent.setup();
    const store = useGuidedPracticeStore.getState();
    store.setMetronomeConfiguration({
      ...store.metronome,
      timeSignature: { numerator: 6, denominator: 8 },
      accentPattern: [true, false],
      subdivision: 3,
    });
    store.setMode("metronome");
    render(<PracticeScreen />);
    const visualizer = within(
      screen.getByRole("region", { name: "Beat visualization" }),
    );
    expect(
      visualizer.getAllByRole("button", { name: /Accent beat/ }),
    ).toHaveLength(2);
    expect(screen.getByText(/2 dotted-quarter pulses/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(screen.getByRole("heading", { name: "Metronome" })).toBeVisible();
    expect(screen.queryByText("Basic Rock")).toBeNull();
    expect(screen.getByText(/6\/8/)).toBeVisible();
    act(() => useAudioStore.setState({ status: "playing" }));
    expect(
      screen.queryByRole("button", { name: "Finish with fill" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Pause playback" }),
    ).toBeEnabled();
  });

  it("keeps the selected subdivision and announcements aligned with progressive stages", () => {
    const store = useGuidedPracticeStore.getState();
    store.setMode("metronome");
    store.setMetronomeConfiguration({
      ...store.metronome,
      trainingMode: "progressive",
    });
    render(<PracticeScreen />);
    const frame = {
      audioTime: 10,
      transportTick: 3072,
      phase: "metronome" as const,
      measure: 5,
      beat: 0,
      subdivision: 2 as const,
      subdivisionIndex: 0,
      isAccent: true,
      stage: 1,
      stageMeasure: 1,
    };
    act(() => metronomeTimeline.emit(frame));
    expect(
      screen.getByRole("radio", { name: "2 — Eighth notes" }),
    ).toBeChecked();
    expect(screen.getByTestId("practice-live-region")).toHaveTextContent(
      "Stage 2 of 4: Eighth notes.",
    );
    act(() => metronomeTimeline.emit({ ...frame, beat: 1, audioTime: 10.75 }));
    expect(screen.getByTestId("practice-live-region")).toHaveTextContent(
      "Stage 2 of 4: Eighth notes.",
    );
  });
});
