"use client";

import { Copy, Heart, Pencil, Play, Square, Target } from "lucide-react";
import Link from "next/link";

import { RhythmPreview } from "@/components/patterns/rhythm-preview";
import { PatternExportButton } from "@/components/patterns/pattern-export-button";
import { isCustomDrumPattern } from "@/lib/persistence-validation";
import {
  formatPatternCategory,
  getTimeSignatureLabel,
} from "@/lib/pattern-filters";
import type { DrumPattern } from "@/types/pattern";

interface PatternCardProps {
  isFavorite: boolean;
  isPreviewing: boolean;
  onFavorite: () => void;
  onOpen: () => void;
  onPreview: () => void;
  pattern: DrumPattern;
}

export function PatternCard({
  isFavorite,
  isPreviewing,
  onFavorite,
  onOpen,
  onPreview,
  pattern,
}: PatternCardProps) {
  return (
    <article className="border-border bg-surface hover:border-border-strong group flex h-full min-w-0 flex-col rounded-2xl border p-4 transition-colors [contain-intrinsic-size:auto_28rem] [content-visibility:auto] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[0.65rem] font-extrabold tracking-[0.12em] uppercase">
            <span className="border-accent/25 bg-accent/10 text-accent rounded-md border px-2 py-1">
              {formatPatternCategory(pattern.category)}
            </span>
            <span className="text-muted">{pattern.difficulty}</span>
            {!pattern.isBuiltIn ? (
              <span className="border-success/30 bg-success/10 text-success rounded-md border px-2 py-1">
                Your pattern
              </span>
            ) : null}
          </div>
          <h2 className="text-foreground text-xl font-black tracking-[-0.03em] [overflow-wrap:anywhere] break-words">
            {pattern.name}
          </h2>
        </div>
        <div className="flex shrink-0 gap-2">
          {isCustomDrumPattern(pattern) ? (
            <PatternExportButton pattern={pattern} />
          ) : null}
          <button
            aria-label={`${isFavorite ? "Remove" : "Add"} ${pattern.name} ${isFavorite ? "from" : "to"} favorites`}
            aria-pressed={isFavorite}
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${isFavorite ? "border-secondary-accent/40 bg-secondary-accent/12 text-secondary-accent" : "border-border text-muted hover:border-border-strong hover:bg-surface-hover hover:text-foreground"}`}
            onClick={onFavorite}
            type="button"
          >
            <Heart
              aria-hidden="true"
              className={`size-5 ${isFavorite ? "fill-current" : ""}`}
            />
          </button>
        </div>
      </div>

      <p className="text-muted min-h-12 text-sm leading-6 [overflow-wrap:anywhere] break-words">
        {pattern.description}
      </p>

      <dl className="my-4 grid grid-cols-2 gap-x-3 gap-y-4 text-sm">
        <div>
          <dt className="text-muted text-[0.62rem] font-bold tracking-wider uppercase">
            Meter
          </dt>
          <dd className="text-foreground mt-1 font-extrabold tabular-nums">
            {getTimeSignatureLabel(pattern)}
          </dd>
        </div>
        <div>
          <dt className="text-muted text-[0.62rem] font-bold tracking-wider uppercase">
            Default
          </dt>
          <dd className="text-foreground mt-1 font-extrabold tabular-nums">
            {pattern.defaultBpm} BPM
          </dd>
        </div>
        <div>
          <dt className="text-muted text-[0.62rem] font-bold tracking-wider uppercase">
            Recommended
          </dt>
          <dd className="text-foreground mt-1 font-extrabold tabular-nums">
            {pattern.recommendedBpmRange.min}-{pattern.recommendedBpmRange.max}{" "}
            BPM
          </dd>
        </div>
        <div>
          <dt className="text-muted text-[0.62rem] font-bold tracking-wider uppercase">
            Grid
          </dt>
          <dd className="text-foreground mt-1 font-extrabold tabular-nums">
            {pattern.subdivision}ths
          </dd>
        </div>
      </dl>

      <div className="border-border bg-background/45 mb-5 rounded-xl border p-3">
        <RhythmPreview pattern={pattern} />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Link
          aria-label={`${pattern.isBuiltIn ? "Duplicate" : "Edit"} ${pattern.name}`}
          className="border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold transition-colors"
          href={`/editor?${pattern.isBuiltIn ? "duplicate" : "pattern"}=${encodeURIComponent(pattern.id)}`}
        >
          {pattern.isBuiltIn ? (
            <Copy aria-hidden="true" className="size-4" />
          ) : (
            <Pencil aria-hidden="true" className="size-4" />
          )}
          {pattern.isBuiltIn ? "Duplicate" : "Edit"}
        </Link>
        <button
          aria-label={`${isPreviewing ? "Stop preview of" : "Preview"} ${pattern.name}`}
          className="border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold transition-colors"
          onClick={onPreview}
          type="button"
        >
          {isPreviewing ? (
            <Square aria-hidden="true" className="size-4 fill-current" />
          ) : (
            <Play aria-hidden="true" className="size-4 fill-current" />
          )}
          {isPreviewing ? "Stop" : "Preview"}
        </button>
        <button
          className="bg-accent text-accent-ink hover:bg-accent-strong col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition-colors sm:col-span-1"
          onClick={onOpen}
          type="button"
        >
          <Target aria-hidden="true" className="size-4" />
          Practice
        </button>
      </div>
    </article>
  );
}
