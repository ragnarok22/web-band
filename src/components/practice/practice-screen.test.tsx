import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PracticeScreen } from "@/components/practice/practice-screen";
import { useAudioStore } from "@/stores/audio-store";
import { usePracticeStore } from "@/stores/practice-store";

const engine = vi.hoisted(() => ({
  pause: vi.fn(),
  play: vi.fn(() => Promise.resolve()),
  setBpm: vi.fn(),
  setMasterVolume: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@/audio/audio-engine", () => ({
  disposeAudioEngine: vi.fn(),
  getAudioEngine: () => engine,
}));

describe("practice screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAudioStore.setState({ errorMessage: null, status: "not-initialized" });
    usePracticeStore.setState({
      bpm: 90,
      countInMeasures: 1,
      hasHydrated: true,
      masterVolume: 0.8,
      selectedPatternId: "basic-rock",
    });
  });

  it("shows Basic Rock and starts only after Play is pressed", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);

    expect(
      screen.getByRole("heading", { name: "Basic Rock" }),
    ).toBeInTheDocument();
    expect(engine.play).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(engine.play).toHaveBeenCalledWith(
      expect.objectContaining({ bpm: 90, masterVolume: 0.8 }),
    );
  });

  it("dismisses the browser audio onboarding hint", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);

    expect(screen.getByRole("note")).toHaveTextContent(
      "Sound begins after you press Play",
    );
    await user.click(screen.getByRole("button", { name: "Dismiss audio tip" }));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
