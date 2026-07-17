import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PatternBrowser } from "@/components/patterns/pattern-browser";
import { useAudioStore } from "@/stores/audio-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeStore } from "@/stores/practice-store";

const router = vi.hoisted(() => ({ push: vi.fn() }));
const engine = vi.hoisted(() => ({
  changePattern: vi.fn(() => false),
  play: vi.fn(() => Promise.resolve()),
  stop: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/audio/audio-engine", () => ({
  disposeAudioEngine: vi.fn(),
  getAudioEngine: () => engine,
}));

describe("pattern browser", () => {
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
    usePatternStore.setState({
      customPatterns: [],
      favoritePatternIds: [],
      isHydrated: true,
      recentPatternIds: [],
      toggleFavorite: vi.fn(async (patternId: string) => {
        usePatternStore.setState({ favoritePatternIds: [patternId] });
      }),
    });
  });

  it("searches and filters the pattern library", async () => {
    const user = userEvent.setup();
    render(<PatternBrowser />);

    await user.type(screen.getByRole("searchbox"), "shuffle blues");
    const patterns = screen.getByRole("region", { name: "Patterns" });
    expect(
      within(patterns).getByRole("heading", { name: "Shuffle Blues" }),
    ).toBeInTheDocument();
    expect(
      within(patterns).queryByRole("heading", { name: "Basic Rock" }),
    ).not.toBeInTheDocument();
  });

  it("filters by genre and marks a favorite", async () => {
    const user = userEvent.setup();
    render(<PatternBrowser />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Genre" }),
      "reggae",
    );
    expect(screen.getByText("4 of 44 patterns")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Add One Drop to favorites" }),
    );
    expect(
      screen.getByRole("button", { name: "Remove One Drop from favorites" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("previews a pattern with its default BPM", async () => {
    const user = userEvent.setup();
    render(<PatternBrowser />);

    await user.click(
      screen.getByRole("button", { name: "Preview Basic Rock" }),
    );
    expect(engine.play).toHaveBeenCalledWith(
      expect.objectContaining({ bpm: 90, masterVolume: 0.8 }),
    );
  });
});
