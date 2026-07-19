"use client";

import {
  FilterX,
  LibraryBig,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { disposeAudioEngine, getAudioEngine } from "@/audio/audio-engine";
import { PatternCard } from "@/components/patterns/pattern-card";
import { PatternSharingControl } from "@/components/patterns/pattern-sharing-control";
import { builtInPatterns } from "@/data/patterns";
import {
  defaultPatternFilters,
  filterAndSortPatterns,
  type PatternFilters,
  type PatternSort,
} from "@/lib/pattern-filters";
import { useAudioStore } from "@/stores/audio-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeStore } from "@/stores/practice-store";
import type {
  DrumPattern,
  PatternCategory,
  PatternDifficulty,
} from "@/types/pattern";

const categories: Array<PatternCategory | "all"> = [
  "all",
  "rock",
  "pop",
  "blues",
  "funk",
  "reggae",
  "country",
  "ballad",
  "latin",
  "metal",
  "jazz",
  "custom",
];

function formatOption(value: string): string {
  return value === "all"
    ? "All"
    : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

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
  const [sort, setSort] = useState<PatternSort>("name");
  const [previewPatternId, setPreviewPatternId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const patterns = [...builtInPatterns, ...customPatterns];
  const favoritePatternIdSet = new Set(favoritePatternIds);
  const visiblePatterns = filterAndSortPatterns(
    patterns,
    filters,
    sort,
    favoritePatternIds,
    recentPatternIds,
  );

  useEffect(() => () => disposeAudioEngine(), []);

  if (!isHydrated) return <PatternBrowserLoading />;

  function updateFilter<Key extends keyof PatternFilters>(
    key: Key,
    value: PatternFilters[Key],
  ): void {
    setFilters((current) => ({ ...current, [key]: value }));
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
        false,
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
    if (!usePatternStore.getState().isHydrated) return;
    setErrorMessage(null);
    try {
      await toggleFavorite(patternId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Favorite could not be saved.",
      );
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[92rem] overflow-x-clip px-3 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-accent mb-3 flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] uppercase">
            <LibraryBig aria-hidden="true" className="size-4" />
            Groove library
          </div>
          <h1 className="text-foreground text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            Find your pocket
          </h1>
          <p className="text-muted mt-3 max-w-2xl leading-7">
            Forty-four original practice grooves, from steady foundations to
            syncopated challenges.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PatternSharingControl />
          <Link
            className="bg-accent text-accent-ink hover:bg-accent-strong flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm font-extrabold transition-colors"
            href="/editor"
          >
            <Plus aria-hidden="true" className="size-4" />
            Create pattern
          </Link>
          <p className="border-border bg-surface text-muted-strong rounded-xl border px-4 py-3 text-sm font-bold tabular-nums">
            {visiblePatterns.length} of {patterns.length} patterns
          </p>
        </div>
      </header>

      <section
        aria-label="Pattern filters"
        className="border-border bg-surface mb-6 rounded-2xl border p-4 sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-[1.7fr_auto]">
          <label className="border-border bg-surface-elevated focus-within:border-accent flex min-h-12 items-center gap-2 rounded-xl border px-3">
            <Search aria-hidden="true" className="text-muted size-4" />
            <span className="sr-only">Search patterns</span>
            <input
              className="text-foreground placeholder:text-muted min-w-0 flex-1 bg-transparent text-sm outline-none"
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search patterns"
              type="search"
              value={filters.search}
            />
          </label>
          <button
            aria-expanded={filtersOpen}
            className="border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:text-foreground flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold transition-colors sm:hidden"
            onClick={() => setFiltersOpen((open) => !open)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            {filtersOpen ? "Hide filters" : "Show filters"}
          </button>
        </div>

        <div
          className={`${filtersOpen ? "mt-3 grid" : "hidden"} gap-3 sm:mt-3 sm:grid sm:grid-cols-2 xl:grid-cols-5`}
        >
          <FilterSelect
            label="Genre"
            onChange={(value) =>
              updateFilter("category", value as PatternCategory | "all")
            }
            options={categories.map((value) => ({
              label: value === "custom" ? "Utility" : formatOption(value),
              value,
            }))}
            value={filters.category}
          />
          <FilterSelect
            label="Difficulty"
            onChange={(value) =>
              updateFilter("difficulty", value as PatternDifficulty | "all")
            }
            options={["all", "beginner", "intermediate", "advanced"].map(
              (value) => ({ label: formatOption(value), value }),
            )}
            value={filters.difficulty}
          />
          <FilterSelect
            label="Meter"
            onChange={(value) => updateFilter("timeSignature", value)}
            options={[
              "all",
              "2/4",
              "3/4",
              "4/4",
              "5/4",
              "6/8",
              "7/8",
              "12/8",
            ].map((value) => ({
              label: value === "all" ? "All meters" : value,
              value,
            }))}
            value={filters.timeSignature}
          />
          <FilterSelect
            label="Grid"
            onChange={(value) =>
              updateFilter(
                "subdivision",
                value === "all" ? "all" : value === "8" ? 8 : 16,
              )
            }
            options={[
              { label: "All grids", value: "all" },
              { label: "Eighth notes", value: "8" },
              { label: "Sixteenth notes", value: "16" },
            ]}
            value={String(filters.subdivision)}
          />
          <FilterSelect
            label="Sort"
            onChange={(value) => setSort(value as PatternSort)}
            options={[
              { label: "Name", value: "name" },
              { label: "Default BPM", value: "bpm" },
              { label: "Recently used", value: "recent" },
              { label: "Favorites first", value: "favorites" },
            ]}
            value={sort}
          />
        </div>
        <div className={filtersOpen ? "block" : "hidden sm:block"}>
          <button
            className="text-muted-strong hover:text-foreground mt-3 flex min-h-11 items-center gap-2 text-xs font-extrabold transition-colors"
            onClick={() => {
              setFilters(defaultPatternFilters);
              setSort("name");
            }}
            type="button"
          >
            <FilterX aria-hidden="true" className="size-4" />
            Clear filters
          </button>
        </div>
      </section>

      {errorMessage ? (
        <p
          className="border-danger/30 bg-danger/10 text-foreground mb-5 rounded-xl border p-4 text-sm"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {visiblePatterns.length > 0 ? (
        <PatternRail
          favoritePatternIdSet={favoritePatternIdSet}
          onFavorite={(patternId) => void favoritePattern(patternId)}
          onOpen={openPattern}
          onPreview={(patternId) => void previewPattern(patternId)}
          patterns={visiblePatterns}
          previewPatternId={status === "stopped" ? null : previewPatternId}
        />
      ) : (
        <section className="border-border bg-surface rounded-2xl border border-dashed px-5 py-16 text-center">
          <h2 className="text-foreground text-xl font-black">
            No grooves match
          </h2>
          <p className="text-muted mt-2">
            Clear a filter or try a broader search.
          </p>
        </section>
      )}
    </main>
  );
}

interface PatternRailProps {
  favoritePatternIdSet: ReadonlySet<string>;
  onFavorite: (patternId: string) => void;
  onOpen: (patternId: string) => void;
  onPreview: (patternId: string) => void;
  patterns: DrumPattern[];
  previewPatternId: string | null;
}

function PatternRail({
  favoritePatternIdSet,
  onFavorite,
  onOpen,
  onPreview,
  patterns,
  previewPatternId,
}: PatternRailProps) {
  return (
    <>
      <p className="text-muted mb-3 flex items-center gap-2 text-xs font-bold md:hidden">
        <span aria-hidden="true" className="bg-accent h-px w-8" />
        Swipe the cards to explore more grooves
      </p>
      <section
        aria-label="Patterns"
        className="-mx-3 flex touch-pan-x snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-3 pb-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-2 md:overflow-x-visible md:px-0 md:pb-0 xl:grid-cols-3"
      >
        {patterns.map((pattern) => (
          <div
            className="w-[calc(100vw-2.5rem)] shrink-0 snap-start sm:w-[calc(100vw-5rem)] md:w-auto md:shrink md:snap-none"
            key={`${pattern.isBuiltIn ? "built-in" : "custom"}:${pattern.id}`}
          >
            <PatternCard
              isFavorite={favoritePatternIdSet.has(pattern.id)}
              isPreviewing={previewPatternId === pattern.id}
              onFavorite={() => onFavorite(pattern.id)}
              onOpen={() => onOpen(pattern.id)}
              onPreview={() => onPreview(pattern.id)}
              pattern={pattern}
            />
          </div>
        ))}
      </section>
    </>
  );
}

function PatternBrowserLoading() {
  return (
    <main className="text-muted flex min-h-screen items-center justify-center px-5 text-center text-sm font-extrabold tracking-wider uppercase">
      <p aria-live="polite" role="status">
        Loading your groove library
      </p>
    </main>
  );
}

interface FilterSelectProps {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}

function FilterSelect({ label, onChange, options, value }: FilterSelectProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted px-1 text-[0.62rem] font-extrabold tracking-wider uppercase">
        {label}
      </span>
      <select
        aria-label={label}
        className="border-border bg-surface-elevated text-foreground min-h-11 rounded-xl border px-3 text-sm font-bold"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
