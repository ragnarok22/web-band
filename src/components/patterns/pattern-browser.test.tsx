import { act, render, screen, waitFor, within } from "@testing-library/react";
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
const patternSharing = vi.hoisted(() => ({
  downloadPatternShareEnvelope: vi.fn(),
  parsePatternShareFile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/audio/audio-engine", () => ({
  disposeAudioEngine: vi.fn(),
  getAudioEngine: () => engine,
}));

vi.mock("@/lib/pattern-sharing-browser", () => patternSharing);

function customPattern(): CustomDrumPattern {
  return {
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
}

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
    await user.click(screen.getByRole("button", { name: "One Drop favorite" }));
    expect(
      screen.getByRole("button", { name: "One Drop favorite" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("previews a pattern with its default BPM", async () => {
    const user = userEvent.setup();
    render(<PatternBrowser />);

    const previewButton = screen.getByRole("button", {
      name: "Basic Rock preview",
    });
    expect(previewButton).toHaveAttribute("aria-pressed", "false");
    await user.click(previewButton);
    expect(engine.play).toHaveBeenCalledWith(
      expect.objectContaining({ bpm: 90, masterVolume: 0.8 }),
    );
    const stopPreviewButton = screen.getByRole("button", {
      name: "Basic Rock preview",
    });
    expect(stopPreviewButton).toHaveAttribute("aria-pressed", "true");

    await user.click(stopPreviewButton);
    expect(engine.stop).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Basic Rock preview" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("disables a favorite toggle while its write is pending", async () => {
    const user = userEvent.setup();
    let finishFavorite!: () => void;
    usePatternStore.setState({
      toggleFavorite: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishFavorite = resolve;
          }),
      ),
    });
    render(<PatternBrowser />);
    const favoriteButton = screen.getByRole("button", {
      name: "Basic Rock favorite",
    });

    await user.click(favoriteButton);
    expect(favoriteButton).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "One Drop favorite" }),
    ).toBeDisabled();

    await act(async () => finishFavorite());
    await waitFor(() => expect(favoriteButton).toBeEnabled());
  });

  it("shows the recommended BPM range on pattern cards", () => {
    render(<PatternBrowser />);
    const card = screen
      .getByRole("heading", { name: "Basic Rock" })
      .closest("article");
    expect(card).not.toBeNull();

    expect(within(card!).getByText("Recommended")).toBeInTheDocument();
    expect(within(card!).getByText("70-130 BPM")).toBeInTheDocument();
  });

  it("previews a pattern with its declared swing", async () => {
    const user = userEvent.setup();
    render(<PatternBrowser />);

    await user.click(
      screen.getByRole("button", { name: "Shuffle Blues preview" }),
    );

    expect(engine.play).toHaveBeenCalledWith(
      expect.objectContaining({ swing: 0.34 }),
    );
  });

  it("gates library actions until custom patterns hydrate", () => {
    usePatternStore.setState({ isHydrated: false });
    render(<PatternBrowser />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your groove library",
    );
    expect(screen.queryByRole("link", { name: "Create pattern" })).toBeNull();
    expect(screen.queryByRole("button", { name: /preview/i })).toBeNull();
  });

  it("surfaces pattern preview failures", async () => {
    const user = userEvent.setup();
    engine.play.mockRejectedValueOnce(new Error("Audio device disconnected."));
    render(<PatternBrowser />);

    await user.click(
      screen.getByRole("button", { name: "Basic Rock preview" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Audio device disconnected.",
    );
  });

  it("links create, built-in duplicate, and custom edit actions", () => {
    usePatternStore.setState({ customPatterns: [customPattern()] });

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
    expect(
      screen.getByRole("heading", { name: "My Pattern" }).closest("article"),
    ).toHaveClass("[content-visibility:auto]");
  });

  it("exports and previews imports for shared custom patterns", async () => {
    const user = userEvent.setup();
    const pattern = customPattern();
    const importPatterns = vi.fn(async () => [
      { pattern, resolution: "created" as const },
    ]);
    usePatternStore.setState({ customPatterns: [pattern], importPatterns });
    patternSharing.parsePatternShareFile.mockResolvedValue({
      byteSize: 100,
      envelope: {
        app: "web-band",
        data: { patterns: [pattern] },
        exportedAt: "2026-07-18T12:00:00.000Z",
        kind: "drum-patterns",
        version: 1,
      },
      fileName: "my-pattern.json",
      patternCount: 1,
    });
    render(<PatternBrowser />);

    expect(
      screen.queryByRole("button", { name: "Export Basic Rock pattern" }),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Export My Pattern pattern" }),
    );
    expect(patternSharing.downloadPatternShareEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ data: { patterns: [pattern] } }),
    );

    await user.upload(
      screen.getByLabelText("Choose shared pattern file"),
      new File(["{}"], "my-pattern.json", { type: "application/json" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Import this pattern?" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Add to library" }));
    expect(importPatterns).toHaveBeenCalledWith([pattern]);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Imported 1 pattern.",
    );
  });
});
