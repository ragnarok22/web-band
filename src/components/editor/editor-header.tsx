"use client";
import { Button } from "@/components/ui/button";

import { ArrowLeft, Play, Save, Square } from "lucide-react";
import Link from "next/link";

interface EditorHeaderProps {
  onPlay: () => void;
  onSave: () => void;
  status: {
    dirty: boolean;
    playing: boolean;
    saving: boolean;
    valid: boolean;
  };
}

export function EditorHeader({ onPlay, onSave, status }: EditorHeaderProps) {
  return (
    <header className="relative mb-5 overflow-hidden rounded-3xl border border-[color:color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[radial-gradient(circle_at_85%_0%,rgba(231,169,75,0.14),transparent_38%),var(--surface)] p-5 sm:p-7">
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link
            className="text-muted-strong hover:text-foreground mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-extrabold"
            href="/patterns"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to patterns
          </Link>
          <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
            Pattern workshop
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            Shape your groove
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
            Set the feel, place each drum hit, then hear the loop exactly as it
            will play in practice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`flex min-h-11 items-center rounded-xl border px-3 text-xs font-extrabold ${
              status.dirty
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-success/30 bg-success/10 text-success"
            }`}
          >
            {status.dirty ? "Unsaved changes" : "Saved locally"}
          </span>
          <Button
            variant="outline"
            aria-label={
              status.playing ? "Stop draft preview" : "Play draft preview"
            }
            aria-pressed={status.playing}
            className="border-border bg-surface-elevated text-foreground flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold disabled:opacity-40"
            disabled={!status.playing && (!status.valid || status.saving)}
            onClick={onPlay}
            type="button"
          >
            {status.playing ? (
              <Square aria-hidden="true" className="size-4 fill-current" />
            ) : (
              <Play aria-hidden="true" className="size-4 fill-current" />
            )}
            {status.playing ? "Stop" : "Play draft"}
          </Button>
          <Button
            className="bg-primary text-accent-ink hover:bg-accent-strong flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-extrabold disabled:opacity-45"
            disabled={status.saving}
            onClick={onSave}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            {status.saving ? "Saving…" : "Save pattern"}
          </Button>
        </div>
      </div>
    </header>
  );
}
