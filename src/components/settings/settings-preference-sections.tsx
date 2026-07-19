"use client";

import { Database, Music2, Palette, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import {
  MAX_HISTORY_MINIMUM_DURATION_SECONDS,
  MIN_HISTORY_MINIMUM_DURATION_SECONDS,
} from "@/lib/history-settings";
import { type ColorTheme, useAppearanceStore } from "@/stores/appearance-store";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePracticeStore } from "@/stores/practice-store";
import { useStorageStore } from "@/stores/storage-store";
import type { CountInMeasures, SoundCharacter } from "@/types/audio";
import type {
  BeatFlashIntensity,
  BpmAdjustmentStep,
  VisualSubdivisionDetail,
} from "@/types/persistence";

const sectionClass =
  "border-border bg-surface/70 rounded-3xl border p-5 sm:p-7";

export function AppearanceSettingsSection() {
  const beatFlashIntensity = useAppearanceStore(
    (state) => state.beatFlashIntensity,
  );
  const reducedMotion = useAppearanceStore((state) => state.reducedMotion);
  const theme = useAppearanceStore((state) => state.theme);
  const visualSubdivisionDetail = useAppearanceStore(
    (state) => state.visualSubdivisionDetail,
  );
  const setBeatFlashIntensity = useAppearanceStore(
    (state) => state.setBeatFlashIntensity,
  );
  const setReducedMotion = useAppearanceStore(
    (state) => state.setReducedMotion,
  );
  const setTheme = useAppearanceStore((state) => state.setTheme);
  const setVisualSubdivisionDetail = useAppearanceStore(
    (state) => state.setVisualSubdivisionDetail,
  );

  return (
    <section
      aria-labelledby="appearance-settings-heading"
      className={sectionClass}
    >
      <p className="text-accent flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] uppercase">
        <Palette aria-hidden="true" className="size-4" />
        Appearance
      </p>
      <h2 className="mt-2 text-2xl font-black" id="appearance-settings-heading">
        Tune the interface
      </h2>
      <div className="border-border mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2">
        <label className="text-sm font-extrabold" htmlFor="color-theme">
          Color theme
          <select
            autoComplete="off"
            className="border-border bg-background text-foreground mt-2 min-h-11 w-full rounded-xl border px-3"
            id="color-theme"
            name="color-theme"
            onChange={(event) =>
              setTheme(event.currentTarget.value as ColorTheme)
            }
            value={theme}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Use device setting</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center justify-between gap-4 text-sm font-extrabold sm:self-end">
          Reduce motion
          <input
            checked={reducedMotion}
            className="size-6 accent-[var(--accent)]"
            onChange={(event) => setReducedMotion(event.target.checked)}
            type="checkbox"
          />
        </label>
        <label className="text-sm font-extrabold" htmlFor="visual-detail">
          Visual subdivision detail
          <select
            className="border-border bg-background text-foreground mt-2 min-h-11 w-full rounded-xl border px-3"
            id="visual-detail"
            onChange={(event) =>
              setVisualSubdivisionDetail(
                event.currentTarget.value as VisualSubdivisionDetail,
              )
            }
            value={visualSubdivisionDetail}
          >
            <option value="beats">Beats only</option>
            <option value="pattern">Match pattern</option>
            <option value="sixteenths">All sixteenths</option>
          </select>
        </label>
        <label className="text-sm font-extrabold" htmlFor="beat-intensity">
          Beat flash intensity
          <select
            className="border-border bg-background text-foreground mt-2 min-h-11 w-full rounded-xl border px-3"
            id="beat-intensity"
            onChange={(event) =>
              setBeatFlashIntensity(
                event.currentTarget.value as BeatFlashIntensity,
              )
            }
            value={beatFlashIntensity}
          >
            <option value="minimal">Minimal</option>
            <option value="standard">Standard</option>
            <option value="strong">Strong</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export function PracticeDefaultsSettingsSection() {
  const hydrated = usePracticeStore((state) => state.hasHydrated);
  const bpmAdjustmentStep = usePracticeStore(
    (state) => state.bpmAdjustmentStep,
  );
  const countInMeasures = usePracticeStore((state) => state.countInMeasures);
  const masterVolume = usePracticeStore((state) => state.masterVolume);
  const restoreLastPractice = usePracticeStore(
    (state) => state.restoreLastPractice,
  );
  const wakeLockEnabled = usePracticeStore((state) => state.wakeLockEnabled);
  const setBpmAdjustmentStep = usePracticeStore(
    (state) => state.setBpmAdjustmentStep,
  );
  const setCountInMeasures = usePracticeStore(
    (state) => state.setCountInMeasures,
  );
  const setMasterVolume = usePracticeStore((state) => state.setMasterVolume);
  const setRestoreLastPractice = usePracticeStore(
    (state) => state.setRestoreLastPractice,
  );
  const setWakeLockEnabled = usePracticeStore(
    (state) => state.setWakeLockEnabled,
  );

  return (
    <section
      aria-labelledby="practice-defaults-heading"
      className={sectionClass}
    >
      <p className="text-accent flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] uppercase">
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Practice defaults
      </p>
      <h2 className="mt-2 text-2xl font-black" id="practice-defaults-heading">
        Start your way
      </h2>
      <div className="border-border mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2">
        <label className="text-sm font-extrabold" htmlFor="default-count-in">
          Count-in
          <select
            className="border-border bg-background text-foreground mt-2 min-h-11 w-full rounded-xl border px-3"
            disabled={!hydrated}
            id="default-count-in"
            onChange={(event) =>
              setCountInMeasures(
                Number(event.currentTarget.value) as CountInMeasures,
              )
            }
            value={countInMeasures}
          >
            <option value={0}>Off</option>
            <option value={1}>1 measure</option>
            <option value={2}>2 measures</option>
            <option value={4}>4 measures</option>
          </select>
        </label>
        <label className="text-sm font-extrabold" htmlFor="bpm-step">
          Default BPM adjustment
          <select
            className="border-border bg-background text-foreground mt-2 min-h-11 w-full rounded-xl border px-3"
            disabled={!hydrated}
            id="bpm-step"
            onChange={(event) =>
              setBpmAdjustmentStep(
                Number(event.currentTarget.value) as BpmAdjustmentStep,
              )
            }
            value={bpmAdjustmentStep}
          >
            <option value={1}>1 BPM</option>
            <option value={5}>5 BPM</option>
          </select>
        </label>
        <label
          className="text-sm font-extrabold sm:col-span-2"
          htmlFor="master-volume"
        >
          <span className="flex items-center justify-between gap-4">
            Master volume
            <span aria-hidden="true" className="text-muted tabular-nums">
              {Math.round(masterVolume * 100)}%
            </span>
          </span>
          <input
            aria-valuetext={`${Math.round(masterVolume * 100)} percent`}
            className="mt-3 w-full accent-[var(--accent)]"
            disabled={!hydrated}
            id="master-volume"
            max={1}
            min={0}
            onChange={(event) =>
              setMasterVolume(event.currentTarget.valueAsNumber)
            }
            step={0.01}
            type="range"
            value={masterVolume}
          />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-4 text-sm font-extrabold">
          Keep screen awake while playing
          <input
            checked={wakeLockEnabled}
            className="size-6 accent-[var(--accent)]"
            disabled={!hydrated}
            onChange={(event) => setWakeLockEnabled(event.target.checked)}
            type="checkbox"
          />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-4 text-sm font-extrabold">
          Restore last practice setup
          <input
            checked={restoreLastPractice}
            className="size-6 accent-[var(--accent)]"
            disabled={!hydrated}
            onChange={(event) => setRestoreLastPractice(event.target.checked)}
            type="checkbox"
          />
        </label>
      </div>
    </section>
  );
}

export function SoundSettingsSection() {
  const hydrated = usePracticeStore((state) => state.hasHydrated);
  const soundCharacter = usePracticeStore((state) => state.soundCharacter);
  const setSoundCharacter = usePracticeStore(
    (state) => state.setSoundCharacter,
  );

  return (
    <section aria-labelledby="sound-settings-heading" className={sectionClass}>
      <p className="text-accent flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] uppercase">
        <Music2 aria-hidden="true" className="size-4" />
        Sound
      </p>
      <h2 className="mt-2 text-2xl font-black" id="sound-settings-heading">
        Shape the kit
      </h2>
      <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
        Choose a synthesized drum character for practice, previews, and the
        pattern editor. Balanced preserves the original Web Band kit.
      </p>
      <label
        className="border-border mt-5 block max-w-sm border-t pt-5 text-sm font-extrabold"
        htmlFor="sound-character"
      >
        Sound character
        <select
          className="border-border bg-background text-foreground mt-2 min-h-11 w-full rounded-xl border px-3"
          disabled={!hydrated}
          id="sound-character"
          onChange={(event) =>
            setSoundCharacter(event.currentTarget.value as SoundCharacter)
          }
          value={soundCharacter}
        >
          <option value="soft">Soft</option>
          <option value="balanced">Balanced</option>
          <option value="punchy">Punchy</option>
        </select>
      </label>
    </section>
  );
}

export function HistorySettingsSection() {
  const enabled = useHistorySettingsStore((state) => state.enabled);
  const minimumDuration = useHistorySettingsStore(
    (state) => state.minimumDurationSeconds,
  );
  const setEnabled = useHistorySettingsStore((state) => state.setEnabled);
  const setMinimumDuration = useHistorySettingsStore(
    (state) => state.setMinimumDurationSeconds,
  );
  const [minimumDurationInput, setMinimumDurationInput] = useState<
    string | null
  >(null);

  return (
    <section
      aria-labelledby="history-settings-heading"
      className={sectionClass}
    >
      <h2 className="text-2xl font-black" id="history-settings-heading">
        Practice history
      </h2>
      <p className="text-muted mt-2 text-sm leading-6">
        Choose whether completed practice sessions become journal entries.
      </p>
      <div className="border-border mt-5 grid gap-5 border-t pt-5 sm:grid-cols-2">
        <label className="flex min-h-11 items-center justify-between gap-4 text-sm font-extrabold">
          Save practice history
          <input
            checked={enabled}
            className="size-6 accent-[var(--accent)]"
            onChange={(event) => setEnabled(event.target.checked)}
            type="checkbox"
          />
        </label>
        <div className="text-sm font-extrabold">
          <label htmlFor="history-minimum-duration">
            Minimum session duration
          </label>
          <span className="border-border bg-background mt-2 flex min-h-11 items-center rounded-xl border px-3">
            <input
              className="text-foreground min-w-0 flex-1 bg-transparent py-2 outline-none"
              id="history-minimum-duration"
              max={MAX_HISTORY_MINIMUM_DURATION_SECONDS}
              min={MIN_HISTORY_MINIMUM_DURATION_SECONDS}
              onBlur={() => setMinimumDurationInput(null)}
              onChange={(event) => {
                setMinimumDurationInput(event.currentTarget.value);
                if (event.currentTarget.value !== "") {
                  setMinimumDuration(event.currentTarget.valueAsNumber);
                }
              }}
              step={1}
              type="number"
              value={minimumDurationInput ?? minimumDuration}
            />
            <span className="text-muted text-xs">seconds</span>
          </span>
          <span className="text-muted mt-1 block text-xs font-medium">
            {MIN_HISTORY_MINIMUM_DURATION_SECONDS}–
            {MAX_HISTORY_MINIMUM_DURATION_SECONDS} seconds; default 30.
          </span>
        </div>
      </div>
    </section>
  );
}

export function StorageStatusSection() {
  const mode = useStorageStore((state) => state.mode);
  const warning = useStorageStore((state) => state.warning);

  return (
    <section aria-labelledby="storage-status-heading" className={sectionClass}>
      <p className="text-accent flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] uppercase">
        <Database aria-hidden="true" className="size-4" />
        Storage status
      </p>
      <h2 className="mt-2 text-2xl font-black" id="storage-status-heading">
        {mode === "indexed-db" ? "Saved on this device" : "Visit-only storage"}
      </h2>
      <p className="text-muted mt-2 text-sm leading-6">
        {mode === "indexed-db"
          ? "Patterns, presets, favorites, and journal entries stay in this browser. Nothing is uploaded to a server."
          : (warning ??
            "Browser database storage is unavailable, so new data lasts only for this visit.")}
      </p>
    </section>
  );
}
