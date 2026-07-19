"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { PracticeModeSelector } from "@/components/practice/practice-mode-selector";
import { ChordTrainerPanel } from "@/components/practice/chord-trainer-panel";
import { StrummingTrainerPanel } from "@/components/practice/strumming-trainer-panel";
import { TempoTrainerPanel } from "@/components/practice/tempo-trainer-panel";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import type { TimeSignature } from "@/types/pattern";

interface GuidedPracticePanelProps {
  activeTimeSignature: TimeSignature;
  sessionDisabled: boolean;
}

export function GuidedPracticePanel({
  activeTimeSignature,
  sessionDisabled,
}: GuidedPracticePanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mode = useGuidedPracticeStore((state) => state.mode);
  const tempoTrainer = useGuidedPracticeStore((state) => state.tempoTrainer);
  const chordTrainer = useGuidedPracticeStore((state) => state.chordTrainer);
  const strummingPattern = useGuidedPracticeStore(
    (state) => state.strummingPattern,
  );
  const setMode = useGuidedPracticeStore((state) => state.setMode);
  const setTempoTrainerConfiguration = useGuidedPracticeStore(
    (state) => state.setTempoTrainerConfiguration,
  );
  const setChordTrainerConfiguration = useGuidedPracticeStore(
    (state) => state.setChordTrainerConfiguration,
  );
  const setStrummingPattern = useGuidedPracticeStore(
    (state) => state.setStrummingPattern,
  );

  return (
    <section aria-labelledby="guided-practice-heading" className="grid gap-3">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
            Practice path
          </p>
          <h2
            className="text-foreground mt-1 text-xl font-black"
            id="guided-practice-heading"
          >
            Guided practice
          </h2>
        </div>
        <p className="text-muted hidden max-w-xs text-right text-xs sm:block">
          Cues follow the active drum groove without changing its feel.
        </p>
      </div>

      <button
        aria-controls="guided-practice-settings"
        aria-expanded={settingsOpen}
        className="border-border bg-surface text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-sm font-extrabold transition-colors sm:hidden"
        onClick={() => setSettingsOpen((open) => !open)}
        type="button"
      >
        {settingsOpen
          ? "Hide guided practice settings"
          : "Show guided practice settings"}
        <ChevronDown
          aria-hidden="true"
          className={`size-5 shrink-0 transition-transform ${settingsOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`${settingsOpen ? "grid" : "hidden"} gap-3 sm:grid`}
        id="guided-practice-settings"
      >
        <PracticeModeSelector
          disabled={sessionDisabled}
          mode={mode}
          onChange={setMode}
        />

        {mode === "drums" ? (
          <div className="border-border bg-surface rounded-2xl border p-4 sm:p-5">
            <p className="text-foreground font-extrabold">Groove only</p>
            <p className="text-muted mt-1 text-sm leading-6">
              Practice the selected drum pattern without tempo, chord, or strum
              cues.
            </p>
          </div>
        ) : null}
        {mode === "tempoTrainer" ? (
          <TempoTrainerPanel
            configuration={tempoTrainer}
            disabled={sessionDisabled}
            onChange={setTempoTrainerConfiguration}
          />
        ) : null}
        {mode === "chords" ? (
          <ChordTrainerPanel
            configuration={chordTrainer}
            disabled={sessionDisabled}
            onChange={setChordTrainerConfiguration}
          />
        ) : null}
        {mode === "strumming" ? (
          <StrummingTrainerPanel
            disabled={sessionDisabled}
            onChange={setStrummingPattern}
            pattern={strummingPattern}
            timeSignature={activeTimeSignature}
          />
        ) : null}
      </div>
    </section>
  );
}
