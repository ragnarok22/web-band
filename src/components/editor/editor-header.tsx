"use client";

import { ArrowLeft, Play, Save, Square } from "lucide-react";
import Link from "next/link";

interface EditorHeaderProps {
  isDirty: boolean;
  isPlaying: boolean;
  isSaving: boolean;
  isValid: boolean;
  onPlay: () => void;
  onSave: () => void;
}

export function EditorHeader({
  isDirty,
  isPlaying,
  isSaving,
  isValid,
  onPlay,
  onSave,
}: EditorHeaderProps) {
  return (
    <header className="relative mb-5 overflow-hidden rounded-3xl border border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[radial-gradient(circle_at_85%_0%,rgba(231,169,75,0.14),transparent_38%),var(--surface)] p-5 sm:p-7">
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            className="text-muted-strong hover:text-foreground mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold"
            href="/patterns"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to patterns
          </Link>
          <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
            Pattern workshop
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            Shape your groove
          </h1>
          <p className="text-muted mt-3 max-w-2xl leading-7">
            Set the feel, place each drum hit, then hear the loop exactly as it
            will play in practice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`flex min-h-11 items-center rounded-xl border px-3 text-xs font-extrabold ${
              isDirty
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-success/30 bg-success/10 text-success"
            }`}
          >
            {isDirty ? "Unsaved changes" : "Saved locally"}
          </span>
          <button
            className="border-border bg-surface-elevated text-foreground flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold disabled:opacity-40"
            disabled={!isPlaying && (!isValid || isSaving)}
            onClick={onPlay}
            type="button"
          >
            {isPlaying ? (
              <Square aria-hidden="true" className="size-4 fill-current" />
            ) : (
              <Play aria-hidden="true" className="size-4 fill-current" />
            )}
            {isPlaying ? "Stop" : "Play draft"}
          </button>
          <button
            className="bg-accent text-accent-ink hover:bg-accent-strong flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-extrabold disabled:opacity-45"
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            {isSaving ? "Saving..." : "Save pattern"}
          </button>
        </div>
      </div>
    </header>
  );
}
