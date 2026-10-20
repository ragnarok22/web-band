import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PatternBrowser } from "@/components/patterns/pattern-browser";
import { disposeAudioEngine } from "@/audio/audio-engine";
import { builtInPatterns } from "@/data/patterns";
import {
  defaultPatternFilters,
  defaultPatternSort,
  filterAndSortPatterns,
} from "@/lib/pattern-filters";
import { useAudioStore } from "@/stores/audio-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeStore } from "@/stores/practice-store";
import type { CustomDrumPattern } from "@/types/persistence";
import type { DrumPattern } from "@/types/pattern";

const router = vi.hoisted(() => ({ push: vi.fn() }));
const engine = vi.hoisted(() => ({
  changePattern: vi.fn<
    (
      pattern: DrumPattern,
      onChange: (pattern: DrumPattern) => void,
      mode: string,
    ) => boolean
  >(() => false),
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
    engine.changePattern.mockReturnValue(false);
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

    await user.click(screen.getByRole("button", { name: "Show filters" }));
    await user.click(screen.getByRole("combobox", { name: "Genre" }));
    await user.click(await screen.findByRole("option", { name: "Reggae" }));
    expect(screen.getByText("4 patterns found")).toBeInTheDocument();
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
      name: "Stop Basic Rock preview",
    });
    expect(stopPreviewButton).toHaveAttribute("aria-pressed", "true");

    await user.click(stopPreviewButton);
    expect(engine.stop).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Basic Rock preview" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("previews immediately without count-in and preserves the practice count-in setting", async () => {
    const user = userEvent.setup();
    usePracticeStore.setState({ countInMeasures: 4 });
    render(<PatternBrowser />);

    await user.click(
      screen.getByRole("button", { name: "Basic Rock preview" }),
    );

    expect(engine.play).toHaveBeenCalledWith(
      expect.objectContaining({
        countInMeasures: 0,
        pattern: expect.objectContaining({ id: "basic-rock" }),
      }),
    );
    expect(usePracticeStore.getState().countInMeasures).toBe(4);
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
      screen.getByRole("button", { name: "Basic Pop favorite" }),
    ).toBeDisabled();

    await act(async () => finishFavorite());
    await waitFor(() => expect(favoriteButton).toBeEnabled());
  });

  it("keeps technical metadata behind Details", async () => {
    const user = userEvent.setup();
    render(<PatternBrowser />);
    const card = screen
      .getByRole("heading", { name: "Basic Rock" })
      .closest("article");
    expect(card).not.toBeNull();

    expect(within(card!).queryByText("Recommended")).not.toBeInTheDocument();
    await user.click(
      within(card!).getByRole("button", { name: "Basic Rock Details" }),
    );
    expect(within(card!).getByText("Recommended")).toBeVisible();
    expect(within(card!).getByText("70-130 BPM")).toBeInTheDocument();
    expect(
      within(card!).getByRole("heading", { name: "About this groove" }),
    ).toBeVisible();
    expect(
      within(card!).getAllByText(
        builtInPatterns.find(({ id }) => id === "basic-rock")!.description,
      ),
    ).toHaveLength(2);
  });

  it("previews a pattern with its declared swing", async () => {
    const user = userEvent.setup();
    render(<PatternBrowser />);

    await user.type(screen.getByRole("searchbox"), "Shuffle Blues");
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
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Create pattern" })).toBeNull();
    expect(screen.queryByRole("button", { name: /preview/i })).toBeNull();

    act(() => usePatternStore.setState({ isHydrated: true }));
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(screen.getByRole("heading", { name: "Basic Rock" })).toBeVisible();
    expect(engine.play).not.toHaveBeenCalled();
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

  it("links create, built-in duplicate, and custom edit actions", async () => {
    const user = userEvent.setup();
    usePatternStore.setState({ customPatterns: [customPattern()] });

    render(<PatternBrowser />);

    expect(
      screen.getByRole("link", { name: "Create pattern" }),
    ).toHaveAttribute("href", "/editor");
    screen.getByRole("button", { name: "More actions for Basic Rock" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "Duplicate Basic Rock" }),
    ).toHaveAttribute("href", "/editor?duplicate=basic-rock");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "My Patterns" }));
    screen.getByRole("button", { name: "More actions for My Pattern" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "Edit My Pattern" }),
    ).toHaveAttribute("href", "/editor?pattern=my-pattern");
    expect(screen.getByText("Your pattern")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Pattern" })).toHaveClass(
      "break-words",
    );
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
    await user.click(screen.getByRole("button", { name: "My Patterns" }));
    screen.getByRole("button", { name: "More actions for My Pattern" }).focus();
    await user.keyboard("{ArrowDown}");
    await user.click(
      screen.getByRole("menuitem", { name: "Export My Pattern pattern" }),
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

  it("exports the complete custom collection from the header More menu", async () => {
    const user = userEvent.setup();
    const pattern = customPattern();
    usePatternStore.setState({ customPatterns: [pattern] });
    render(<PatternBrowser />);
    screen.getByRole("button", { name: "More library actions" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "Import patterns" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("menuitem", { name: "Export my patterns" }),
    );
    expect(patternSharing.downloadPatternShareEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ data: { patterns: [pattern] } }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Pattern export download started for 1 pattern.",
    );
  });

  it("loads all built-in patterns in batches without duplicates and focuses new results", async () => {
    const user = userEvent.setup();
    render(<PatternBrowser />);
    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(screen.getByText("Showing 12 of 44 patterns")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("article")
        .slice(0, 3)
        .map(
          (card) => within(card).getByRole("heading", { level: 2 }).textContent,
        ),
    ).toEqual(["Basic Rock", "Basic Pop", "Straight Blues"]);
    for (const count of [24, 36, 44]) {
      const firstNewIndex = screen.getAllByRole("article").length;
      await user.click(screen.getByRole("button", { name: "Load more" }));
      expect(screen.getAllByRole("article")).toHaveLength(count);
      expect(screen.getAllByRole("article")[firstNewIndex]).toHaveFocus();
    }
    const names = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(new Set(names).size).toBe(44);
    expect(names).toEqual(
      filterAndSortPatterns(
        builtInPatterns,
        defaultPatternFilters,
        defaultPatternSort,
        [],
        [],
      ).map(({ name }) => name),
    );
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  it("filters and sorts the full collection before limiting results, resetting each batch", async () => {
    const user = userEvent.setup();
    render(<PatternBrowser />);
    await user.click(screen.getByRole("button", { name: "Load more" }));
    await user.click(screen.getByRole("button", { name: "Show filters" }));
    await user.click(screen.getByRole("combobox", { name: "Sort order" }));
    await user.click(
      await screen.findByRole("option", { name: "Default BPM" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(
      filterAndSortPatterns(
        builtInPatterns,
        defaultPatternFilters,
        "bpm",
        [],
        [],
      )
        .slice(0, 12)
        .map(({ name }) => name),
    );
    await user.click(screen.getByRole("button", { name: "Load more" }));
    await user.type(screen.getByRole("searchbox"), "Shuffle Blues");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getAllByRole("article")).toHaveLength(12);
    expect(
      screen.getByRole("combobox", { name: "Sort order" }),
    ).toHaveTextContent("Recommended");
  });

  it("combines exclusive quick filters with search and advanced filters", async () => {
    const user = userEvent.setup();
    usePatternStore.setState({
      customPatterns: [customPattern()],
      favoritePatternIds: ["one-drop", "my-pattern"],
    });
    render(<PatternBrowser />);
    for (const difficulty of ["Beginner", "Intermediate", "Advanced"]) {
      await user.click(screen.getByRole("button", { name: difficulty }));
      const expected = builtInPatterns.filter(
        (pattern) => pattern.difficulty === difficulty.toLowerCase(),
      );
      expect(screen.getAllByRole("article").length).toBe(
        Math.min(12, expected.length + (difficulty === "Beginner" ? 1 : 0)),
      );
      expect(
        within(
          screen.getByRole("group", { name: "Quick filters" }),
        ).getAllByRole("button", { pressed: true }),
      ).toHaveLength(1);
    }
    await user.click(screen.getByRole("button", { name: "Favorites" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Show filters" }));
    await user.click(screen.getByRole("combobox", { name: "Genre" }));
    await user.click(await screen.findByRole("option", { name: "Reggae" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "One Drop" })).toBeVisible();
    await user.type(screen.getByRole("searchbox"), "impossible groove");
    expect(
      screen.getByRole("heading", { name: "No grooves found." }),
    ).toBeVisible();
    expect(screen.getByText(/Save patterns with the heart icon/)).toBeVisible();
    await user.click(
      screen.getAllByRole("button", { name: "Reset filters" }).at(-1)!,
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("sorts recently used patterns and applies the selected pattern's practice defaults", async () => {
    const user = userEvent.setup();
    const markRecent = vi.fn();
    usePatternStore.setState({
      recentPatternIds: ["shuffle-blues", "one-drop"],
      markRecent,
    });
    render(<PatternBrowser />);
    await user.click(screen.getByRole("button", { name: "Show filters" }));
    await user.click(screen.getByRole("combobox", { name: "Sort order" }));
    await user.click(
      await screen.findByRole("option", { name: "Recently used" }),
    );
    const card = screen.getAllByRole("article")[0];
    expect(card).toHaveAccessibleName("Shuffle Blues");
    await user.click(within(card).getByRole("button", { name: "Practice" }));
    expect(usePracticeStore.getState()).toMatchObject({
      selectedPatternId: "shuffle-blues",
      swing: 0.34,
    });
    expect(usePracticeStore.getState().bpm).toBe(
      builtInPatterns.find(({ id }) => id === "shuffle-blues")!.defaultBpm,
    );
    expect(markRecent).toHaveBeenCalledWith("shuffle-blues");
    expect(disposeAudioEngine).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/practice");
  });

  it("immediately stops the previous preview and starts the next from its own defaults", async () => {
    const user = userEvent.setup();
    usePracticeStore.setState({ swing: 0.2 });
    const { unmount } = render(<PatternBrowser />);
    await user.click(
      screen.getByRole("button", { name: "Basic Rock preview" }),
    );
    act(() => useAudioStore.setState({ status: "playing" }));
    const basicPop = builtInPatterns.find(({ id }) => id === "basic-pop")!;
    engine.changePattern.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Basic Pop preview" }));
    expect(engine.stop).toHaveBeenCalledOnce();
    expect(engine.play).toHaveBeenCalledTimes(2);
    expect(engine.stop.mock.invocationCallOrder[0]).toBeLessThan(
      engine.play.mock.invocationCallOrder[1],
    );
    expect(engine.changePattern).not.toHaveBeenCalled();
    expect(engine.play).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bpm: basicPop.defaultBpm,
        countInMeasures: 0,
        pattern: basicPop,
        swing: 0.2,
      }),
    );
    expect(
      screen.getByRole("button", { name: "Basic Rock preview" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "Stop Basic Pop preview" }),
    ).toHaveTextContent("Stop");
    unmount();
    expect(disposeAudioEngine).toHaveBeenCalled();
  });

  it("replaces an initializing preview without waiting for it or allowing a stale error to reset the new one", async () => {
    const user = userEvent.setup();
    let rejectFirst!: (error: Error) => void;
    engine.play.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );
    render(<PatternBrowser />);
    await user.click(
      screen.getByRole("button", { name: "Basic Rock preview" }),
    );
    act(() => useAudioStore.setState({ status: "initializing" }));
    await user.click(screen.getByRole("button", { name: "Basic Pop preview" }));

    expect(engine.stop).toHaveBeenCalledOnce();
    expect(engine.play).toHaveBeenCalledTimes(2);
    await act(async () =>
      rejectFirst(new Error("Cancelled preview failed late.")),
    );
    expect(
      screen.getByRole("button", { name: "Stop Basic Pop preview" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps a stopped preview stopped if its pending start fails later", async () => {
    const user = userEvent.setup();
    let rejectStart!: (error: Error) => void;
    engine.play.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectStart = reject;
        }),
    );
    render(<PatternBrowser />);
    await user.click(
      screen.getByRole("button", { name: "Basic Rock preview" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Stop Basic Rock preview" }),
    );
    await act(async () =>
      rejectStart(new Error("Stopped preview failed late.")),
    );
    expect(engine.stop).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Basic Rock preview" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
