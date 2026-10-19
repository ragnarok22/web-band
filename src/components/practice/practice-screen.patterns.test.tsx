import {
  engine,
  selectQuickPattern,
  setupPracticeScreenTests,
} from "./practice-screen.test-support";
import { PracticeScreen } from "@/components/practice/practice-screen";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { quarterDownstrokesPattern } from "@/data/strumming-patterns";
import { useAudioStore } from "@/stores/audio-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { usePracticeStore } from "@/stores/practice-store";
import { renderWithMotion as render } from "@/test/render-with-motion";

describe("practice screen — patterns", () => {
  setupPracticeScreenTests();

  it("changes a stopped pattern immediately", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    await selectQuickPattern(user, "one-drop");
    expect(
      screen.getByRole("heading", { name: "One Drop" }),
    ).toBeInTheDocument();
    expect(usePracticeStore.getState().selectedPatternId).toBe("one-drop");
  });

  it("adopts a selected pattern's default swing", async () => {
    const user = userEvent.setup();
    render(<PracticeScreen />);
    await selectQuickPattern(user, "shuffle-blues");
    expect(usePracticeStore.getState().swing).toBe(0.34);
    await user.click(screen.getByRole("button", { name: "Pattern Details" }));
    expect(screen.getByText("Swing 8ths")).toBeInTheDocument();
  });

  it("queues active pattern changes after a transition fill by default", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    engine.changePattern.mockReturnValueOnce(true);
    render(<PracticeScreen />);
    await selectQuickPattern(user, "driving-eighths");
    expect(engine.changePattern).toHaveBeenCalledWith(
      expect.objectContaining({ id: "driving-eighths" }),
      expect.any(Function),
      "fill",
    );
    expect(
      screen.getByText("Queued after a transition fill"),
    ).toBeInTheDocument();
  });

  it("switches an active same-meter pattern immediately when requested", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    usePracticeStore.setState({ swing: 0.34 });
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Pattern Details" }));
    const immediateSwitch = screen.getByRole("checkbox", {
      name: "Switch same-meter patterns immediately",
    });
    engine.changePattern.mockImplementationOnce(
      (_pattern: unknown, onPatternChanged?: () => void, mode?: string) => {
        expect(mode).toBe("immediate");
        onPatternChanged?.();
        return true;
      },
    );
    await user.click(immediateSwitch);
    await selectQuickPattern(user, "driving-eighths");
    expect(usePracticeStore.getState()).toMatchObject({
      selectedPatternId: "driving-eighths",
      swing: 0,
    });
    expect(
      screen.queryByText("Queued after a transition fill"),
    ).not.toBeInTheDocument();
  });

  it("keeps cross-meter changes queued when immediate switching is enabled", async () => {
    const user = userEvent.setup();
    useAudioStore.setState({ status: "playing" });
    engine.changePattern.mockReturnValueOnce(true);
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Pattern Details" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: "Switch same-meter patterns immediately",
      }),
    );
    await selectQuickPattern(user, "simple-six-eight");
    expect(engine.changePattern).toHaveBeenCalledWith(
      expect.objectContaining({ id: "simple-six-eight" }),
      expect.any(Function),
      "fill",
    );
    expect(
      screen.getByText("Queued after a transition fill"),
    ).toBeInTheDocument();
  });

  it("rejects an incompatible active guided pattern change", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.setState({ mode: "chords" });
    useAudioStore.setState({ status: "playing" });
    engine.changePattern.mockReturnValueOnce(false);
    render(<PracticeScreen />);
    await selectQuickPattern(user, "simple-six-eight");
    expect(usePracticeStore.getState().selectedPatternId).toBe("basic-rock");
    expect(screen.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
    expect(
      screen.getByText(/Stop the active guided session before changing meter/i),
    ).toBeInTheDocument();
  });

  it("surfaces an incompatible stopped strumming setup before playback", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.setState({
      mode: "strumming",
      strummingPattern: structuredClone(quarterDownstrokesPattern),
    });
    usePracticeStore.setState({ selectedPatternId: "simple-six-eight" });
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Play" }));
    expect(
      screen.getByText(/Choose a 6\/8 strumming pattern before playing/i),
    ).toBeInTheDocument();
    expect(engine.play).not.toHaveBeenCalled();
  });
});
