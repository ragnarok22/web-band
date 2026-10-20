"use client";

import { ChevronDown, LibraryBig, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { disposeAudioEngine, getAudioEngine } from "@/audio/audio-engine";
import { PatternCard } from "@/components/patterns/pattern-card";
import { PatternFiltersPanel } from "@/components/patterns/pattern-filters-panel";
import { PatternSharingControl } from "@/components/patterns/pattern-sharing-control";
import { Button } from "@/components/ui/button";
import { builtInPatterns } from "@/data/patterns";
import {
  defaultPatternFilters,
  defaultPatternSort,
  filterAndSortPatterns,
  type PatternFilters,
  type PatternSort,
} from "@/lib/pattern-filters";
import { useAudioStore } from "@/stores/audio-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeStore } from "@/stores/practice-store";
import type { DrumPattern } from "@/types/pattern";
import type { AudioEngineStatus } from "@/types/audio";

const PAGE_SIZE = 12;

export function PatternBrowser() {
  const router = useRouter();
  const status = useAudioStore((state) => state.status);
  const masterVolume = usePracticeStore((state) => state.masterVolume);
  const setBpm = usePracticeStore((state) => state.setBpm);
  const setSelectedPatternId = usePracticeStore(
    (state) => state.setSelectedPatternId,
  );
  const setSwing = usePracticeStore((state) => state.setSwing);
  const customPatterns = usePatternStore((state) => state.customPatterns);
  const isHydrated = usePatternStore((state) => state.isHydrated);
  const favoritePatternIds = usePatternStore(
    (state) => state.favoritePatternIds,
  );
  const recentPatternIds = usePatternStore((state) => state.recentPatternIds);
  const markRecent = usePatternStore((state) => state.markRecent);
  const toggleFavorite = usePatternStore((state) => state.toggleFavorite);
  const [filters, setFilters] = useState<PatternFilters>(defaultPatternFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<PatternSort>(defaultPatternSort);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const resultsRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const nextFocusIndex = useRef<number | null>(null);
  const [previewPatternId, setPreviewPatternId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const patterns = [...builtInPatterns, ...customPatterns];
  const favoritePatternIdSet = new Set(favoritePatternIds);
  const matchingPatterns = filterAndSortPatterns(
    patterns,
    filters,
    sort,
    favoritePatternIds,
    recentPatternIds,
  );
  const visiblePatterns = matchingPatterns.slice(0, visibleCount);

  useEffect(() => () => disposeAudioEngine(), []);
  useEffect(() => {
    if (nextFocusIndex.current === null) return;
    resultsRef.current
      ?.querySelectorAll<HTMLElement>("article")
      [nextFocusIndex.current]?.focus();
    nextFocusIndex.current = null;
  }, [visibleCount]);

  if (!isHydrated) return <PatternBrowserLoading />;

  function updateFilter<Key extends keyof PatternFilters>(
    key: Key,
    value: PatternFilters[Key],
  ): void {
    setFilters((current) => ({ ...current, [key]: value }));
    setVisibleCount(PAGE_SIZE);
  }

  function resetFilters(): void {
    setFilters(defaultPatternFilters);
    setSort(defaultPatternSort);
    setVisibleCount(PAGE_SIZE);
    searchInputRef.current?.focus();
  }

  async function previewPattern(patternId: string): Promise<void> {
    if (!usePatternStore.getState().isHydrated) return;
    const pattern = patterns.find((candidate) => candidate.id === patternId);
    if (!pattern) return;

    const engine = getAudioEngine();
    if (previewPatternId === pattern.id && status !== "stopped") {
      engine.stop();
      setPreviewPatternId(null);
      return;
    }

    if (
      engine.changePattern(
        pattern,
        (changedPattern) => {
          setPreviewPatternId(changedPattern.id);
        },
        "measure",
      )
    ) {
      return;
    }

    setPreviewPatternId(pattern.id);
    try {
      const settings = usePracticeStore.getState();
      await engine.play({
        bpm: pattern.defaultBpm,
        countInMeasures: settings.countInMeasures,
        fillFrequency: settings.fillFrequency,
        guidedPractice: { mode: "drums" },
        humanization: settings.humanization,
        masterVolume,
        mixer: settings.mixer,
        pattern,
        soundCharacter: settings.soundCharacter,
        swing: pattern.swing ?? settings.swing,
      });
    } catch (error) {
      setPreviewPatternId(null);
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : useAudioStore.getState().errorMessage ||
              "Pattern preview audio could not start.",
      );
    }
  }

  function openPattern(patternId: string): void {
    if (!usePatternStore.getState().isHydrated) return;
    const pattern = patterns.find((candidate) => candidate.id === patternId);
    if (!pattern) return;
    disposeAudioEngine();
    setSelectedPatternId(pattern.id);
    setBpm(pattern.defaultBpm);
    setSwing(pattern.swing ?? 0);
    markRecent(pattern.id);
    router.push("/practice");
  }

  async function favoritePattern(patternId: string): Promise<void> {
    if (!usePatternStore.getState().isHydrated || pendingFavoriteIds.size > 0) {
      return;
    }
    setErrorMessage(null);
    setPendingFavoriteIds((current) => new Set(current).add(patternId));
    try {
      await toggleFavorite(patternId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Favorite could not be saved.",
      );
    } finally {
      setPendingFavoriteIds((current) => {
        const next = new Set(current);
        next.delete(patternId);
        return next;
      });
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[100rem] px-3 py-6 sm:px-6 lg:px-8">
      <PatternBrowserHeader />

      <PatternFiltersPanel
        filters={filters}
        isOpen={filtersOpen}
        onClear={resetFilters}
        onFilterChange={updateFilter}
        onToggle={() => setFiltersOpen((open) => !open)}
        onSortChange={(nextSort) => {
          setSort(nextSort);
          setVisibleCount(PAGE_SIZE);
        }}
        sort={sort}
        searchInputRef={searchInputRef}
      />

      <p
        aria-live="polite"
        aria-atomic="true"
        className="text-muted-foreground mb-3 text-sm tabular-nums"
      >
        {matchingPatterns.length}{" "}
        {matchingPatterns.length === 1 ? "pattern" : "patterns"} found
      </p>

      {errorMessage ? (
        <p
          className="border-danger/30 bg-danger/10 text-foreground mb-5 rounded-xl border p-4 text-sm"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {visiblePatterns.length > 0 ? (
        <PatternGrid
          favoritePatternIdSet={favoritePatternIdSet}
          pendingFavoriteIds={pendingFavoriteIds}
          onFavorite={(patternId) => void favoritePattern(patternId)}
          onOpen={openPattern}
          onPreview={(patternId) => void previewPattern(patternId)}
          patterns={visiblePatterns}
          previewPatternId={status === "stopped" ? null : previewPatternId}
          previewStatus={status}
          resultsRef={resultsRef}
        />
      ) : (
        <section className="border-border bg-surface rounded-2xl border border-dashed px-5 py-16 text-center">
          <Search
            aria-hidden="true"
            className="text-muted-foreground mx-auto mb-3 size-6"
          />
          <h2 className="text-foreground text-xl font-black">
            No grooves found.
          </h2>
          <p className="text-muted-foreground mt-2">
            {filters.quickFilter === "favorites"
              ? "Save patterns with the heart icon to find them here. Try a different search or reset your filters."
              : "Try a different search or reset your filters."}
          </p>
          <Button
            className="mt-4 min-h-11"
            onClick={resetFilters}
            variant="outline"
          >
            Reset filters
          </Button>
        </section>
      )}

      {matchingPatterns.length > 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 pb-2">
          <p
            aria-live="polite"
            aria-atomic="true"
            className="text-muted-foreground text-xs tabular-nums"
          >
            Showing {visiblePatterns.length} of {matchingPatterns.length}{" "}
            patterns
          </p>
          {visiblePatterns.length < matchingPatterns.length ? (
            <Button
              className="min-h-11 gap-2 px-6 font-bold"
              onClick={() => {
                nextFocusIndex.current = visiblePatterns.length;
                setVisibleCount((count) => count + PAGE_SIZE);
              }}
              variant="outline"
            >
              Load more
              <ChevronDown aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

function PatternBrowserHeader() {
  return (
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-primary mb-3 flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] uppercase">
          <LibraryBig aria-hidden="true" className="size-4" />
          Groove library
        </div>
        <h1 className="text-foreground text-4xl font-black tracking-[-0.05em] sm:text-5xl">
          Find your pocket
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
          Explore drum grooves, preview rhythms, and find your next practice
          session.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          className="bg-primary text-accent-ink hover:bg-accent-strong flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition-colors"
          href="/editor"
        >
          <Plus aria-hidden="true" className="size-4" />
          Create pattern
        </Link>
        <PatternSharingControl />
      </div>
    </header>
  );
}

interface PatternGridProps {
  previewStatus: AudioEngineStatus;
  favoritePatternIdSet: ReadonlySet<string>;
  pendingFavoriteIds: ReadonlySet<string>;
  onFavorite: (patternId: string) => void;
  onOpen: (patternId: string) => void;
  onPreview: (patternId: string) => void;
  patterns: DrumPattern[];
  previewPatternId: string | null;
  resultsRef: React.RefObject<HTMLElement | null>;
}

function PatternGrid({
  favoritePatternIdSet,
  pendingFavoriteIds,
  onFavorite,
  onOpen,
  onPreview,
  patterns,
  previewPatternId,
  previewStatus,
  resultsRef,
}: PatternGridProps) {
  return (
    <section
      aria-label="Patterns"
      className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      ref={resultsRef}
    >
      {patterns.map((pattern) => (
        <PatternCard
          key={`${pattern.isBuiltIn ? "built-in" : "custom"}:${pattern.id}`}
          favoriteDisabled={pendingFavoriteIds.size > 0}
          isFavorite={favoritePatternIdSet.has(pattern.id)}
          isPreviewing={previewPatternId === pattern.id}
          previewStatus={previewStatus}
          onFavorite={() => onFavorite(pattern.id)}
          onOpen={() => onOpen(pattern.id)}
          onPreview={() => onPreview(pattern.id)}
          pattern={pattern}
        />
      ))}
    </section>
  );
}

function PatternBrowserLoading() {
  return (
    <main className="text-muted-foreground flex min-h-screen items-center justify-center px-5 text-center text-sm font-extrabold tracking-wider uppercase">
      <p aria-live="polite" role="status">
        Loading your groove library
      </p>
    </main>
  );
}
