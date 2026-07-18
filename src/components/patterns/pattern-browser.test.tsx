import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PatternBrowser } from "@/components/patterns/pattern-browser";
import { useAudioStore } from "@/stores/audio-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeStore } from "@/stores/practice-store";
import type { CustomDrumPattern } from "@/types/persistence";

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

  it("gates library actions until custom patterns hydrate", () => {
    usePatternStore.setState({ isHydrated: false });
    render(<PatternBrowser />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your groove library",
    );
    expect(screen.queryByRole("link", { name: "Create pattern" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Preview/ })).toBeNull();
  });

  it("surfaces pattern preview failures", async () => {
    const user = userEvent.setup();
    engine.play.mockRejectedValueOnce(new Error("Audio device disconnected."));
    render(<PatternBrowser />);

    await user.click(
      screen.getByRole("button", { name: "Preview Basic Rock" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Audio device disconnected.",
    );
  });

  it("links create, built-in duplicate, and custom edit actions", () => {
    const customPattern: CustomDrumPattern = {
      bars: 1,
      category: "rock",
      createdAt: "2026-07-18T12:00:00.000Z",
      defaultBpm: 90,
      description: "Made here.",
      difficulty: "beginner",
      hits: [],
      id: "my-pattern",
      isBuiltIn: false,
      name: "My Pattern",
      recommendedBpmRange: { max: 120, min: 70 },
      subdivision: 8,
      timeSignature: { denominator: 4, numerator: 4 },
      updatedAt: "2026-07-18T12:00:00.000Z",
    };
    usePatternStore.setState({ customPatterns: [customPattern] });

    render(<PatternBrowser />);

    expect(
      screen.getByRole("link", { name: "Create pattern" }),
    ).toHaveAttribute("href", "/editor");
    expect(
      screen.getByRole("link", { name: "Duplicate Basic Rock" }),
    ).toHaveAttribute("href", "/editor?duplicate=basic-rock");
    expect(
      screen.getByRole("link", { name: "Edit My Pattern" }),
    ).toHaveAttribute("href", "/editor?pattern=my-pattern");
    expect(screen.getByText("Your pattern")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Pattern" })).toHaveClass(
      "break-words",
    );
  });
});
