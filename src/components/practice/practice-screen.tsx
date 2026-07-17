"use client";

import {
  AudioLines,
  CircleDot,
  Clock3,
  Drum,
  Info,
  LibraryBig,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { disposeAudioEngine, getAudioEngine } from "@/audio/audio-engine";
import { BpmControls } from "@/components/practice/bpm-controls";
import { BeatVisualizer } from "@/components/practice/beat-visualizer";
import { MasterVolume } from "@/components/practice/master-volume";
import { TransportControls } from "@/components/practice/transport-controls";
import { builtInPatterns, getPatternById } from "@/data/patterns";
import { clampBpm } from "@/lib/musical-time";
import { formatPatternCategory } from "@/lib/pattern-filters";
import { useAudioStore } from "@/stores/audio-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeStore } from "@/stores/practice-store";
import type { AudioEngineStatus } from "@/types/audio";

const ONBOARDING_KEY = "web-band-onboarding-dismissed";

function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(ONBOARDING_KEY) !== "true";
  } catch {
    return true;
  }
}

const statusCopy: Record<AudioEngineStatus, string> = {
  "not-initialized": "Audio waits for your first press",
  initializing: "Starting audio engine",
  ready: "Audio engine ready",
  "counting-in": "Count in: listen for the downbeat",
  playing: "Groove playing",
  paused: "Groove paused",
  stopped: "Groove stopped",
  suspended: "Browser audio suspended: press Play to resume",
  error: "Audio could not start",
};

export function PracticeScreen() {
  const status = useAudioStore((state) => state.status);
  const errorMessage = useAudioStore((state) => state.errorMessage);
  const bpm = usePracticeStore((state) => state.bpm);
  const masterVolume = usePracticeStore((state) => state.masterVolume);
  const selectedPatternId = usePracticeStore(
    (state) => state.selectedPatternId,
  );
  const setBpm = usePracticeStore((state) => state.setBpm);
  const setMasterVolume = usePracticeStore((state) => state.setMasterVolume);
  const setSelectedPatternId = usePracticeStore(
    (state) => state.setSelectedPatternId,
  );
  const customPatterns = usePatternStore((state) => state.customPatterns);
  const markRecent = usePatternStore((state) => state.markRecent);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);
  const [pendingPatternId, setPendingPatternId] = useState<string | null>(null);
  const [patternAnnouncement, setPatternAnnouncement] = useState("");
  const patterns = [...builtInPatterns, ...customPatterns];
  const pattern = getPatternById(selectedPatternId, customPatterns);

  useEffect(() => {
    return () => disposeAudioEngine();
  }, []);

  function changeBpm(value: number): void {
    const nextBpm = clampBpm(value, bpm);
    setBpm(nextBpm);
    if (status !== "not-initialized" && status !== "error") {
      getAudioEngine().setBpm(nextBpm);
    }
  }

  function changeMasterVolume(volume: number): void {
    setMasterVolume(volume);
    getAudioEngine().setMasterVolume(volume);
  }

  function dismissOnboarding(): void {
    try {
      window.localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      // The hint can still be dismissed for the current page when storage is blocked.
    }
    setShowOnboarding(false);
  }

  async function play(): Promise<void> {
    markRecent(pattern.id);
    try {
      await getAudioEngine().play({ bpm, masterVolume, pattern });
    } catch {
      // The engine records and exposes a user-facing error through the audio store.
    }
  }

  function changePattern(patternId: string): void {
    const nextPattern = patterns.find(
      (candidate) => candidate.id === patternId,
    );
    if (!nextPattern || nextPattern.id === pattern.id) return;

    const commitPattern = (changedPattern: typeof nextPattern) => {
      setSelectedPatternId(changedPattern.id);
      markRecent(changedPattern.id);
      setPendingPatternId(null);
      setPatternAnnouncement(`Pattern changed to ${changedPattern.name}.`);
    };

    if (getAudioEngine().changePattern(nextPattern, commitPattern)) {
      setPendingPatternId(nextPattern.id);
      setPatternAnnouncement(
        `${nextPattern.name} queued for the next measure.`,
      );
    } else {
      commitPattern(nextPattern);
    }
  }

  function stop(): void {
    setPendingPatternId(null);
    getAudioEngine().stop();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[92rem] flex-col px-3 pb-8 sm:px-6 lg:px-8">
      <header className="border-border flex min-h-20 items-center justify-between border-b py-4">
        <div className="flex items-center gap-3">
          <span className="border-accent/25 bg-accent/10 text-accent flex size-11 items-center justify-center rounded-xl border shadow-[inset_0_1px_rgba(255,255,255,0.08)]">
            <Drum aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="text-foreground text-lg leading-tight font-extrabold tracking-[-0.03em]">
              Web Band
            </p>
            <p className="text-muted text-xs font-semibold tracking-[0.12em] uppercase">
              Practice room
            </p>
          </div>
        </div>
        <div className="border-border bg-surface text-muted-strong flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${status === "playing" ? "bg-success shadow-[0_0_12px_var(--success)]" : status === "counting-in" ? "bg-secondary-accent" : "bg-muted"}`}
          />
          <span className="hidden sm:inline">{statusCopy[status]}</span>
          <span className="sm:hidden">{status.replace("-", " ")}</span>
        </div>
      </header>

      <div className="grid flex-1 gap-4 pt-4 lg:grid-cols-[minmax(16rem,0.78fr)_minmax(25rem,1.5fr)_minmax(16rem,0.78fr)] lg:items-start lg:gap-5 lg:pt-6">
        <aside className="order-2 grid gap-4 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">
          <section className="border-border bg-surface relative overflow-hidden rounded-2xl border p-5">
            <div
              aria-hidden="true"
              className="bg-accent/8 absolute -top-20 -right-20 size-48 rounded-full blur-3xl"
            />
            <div className="relative">
              <div className="mb-6 flex items-center justify-between">
                <span className="border-accent/25 bg-accent/10 text-accent rounded-md border px-2.5 py-1 text-xs font-extrabold tracking-[0.12em] uppercase">
                  {formatPatternCategory(pattern.category)}
                </span>
                <AudioLines aria-hidden="true" className="text-muted size-5" />
              </div>
              <p className="text-muted text-xs font-bold tracking-[0.16em] uppercase">
                Current pattern
              </p>
              <h1 className="text-foreground mt-2 text-3xl font-black tracking-[-0.045em]">
                {pattern.name}
              </h1>
              <label className="mt-4 block">
                <span className="text-muted mb-1 block text-[0.65rem] font-extrabold tracking-wider uppercase">
                  Quick select
                </span>
                <select
                  aria-label="Current pattern"
                  className="border-border bg-surface-elevated text-foreground min-h-11 w-full rounded-xl border px-3 text-sm font-bold"
                  onChange={(event) => changePattern(event.target.value)}
                  value={pendingPatternId ?? pattern.id}
                >
                  {patterns.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} - {candidate.timeSignature.numerator}/
                      {candidate.timeSignature.denominator}
                    </option>
                  ))}
                </select>
              </label>
              {pendingPatternId ? (
                <p className="text-secondary-accent mt-2 text-xs font-bold">
                  Queued for the next measure
                </p>
              ) : null}
              <p className="text-muted mt-3 text-sm leading-6">
                {pattern.description}
              </p>
              <dl className="border-border mt-6 grid grid-cols-2 gap-3 border-t pt-4">
                <div>
                  <dt className="text-muted text-[0.68rem] font-bold tracking-wider uppercase">
                    Meter
                  </dt>
                  <dd className="text-foreground mt-1 font-extrabold tabular-nums">
                    {pattern.timeSignature.numerator}/
                    {pattern.timeSignature.denominator}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-[0.68rem] font-bold tracking-wider uppercase">
                    Feel
                  </dt>
                  <dd className="text-foreground mt-1 font-extrabold">
                    {pattern.swing ? "Swing" : "Straight"} {pattern.subdivision}
                    ths
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <MasterVolume onChange={changeMasterVolume} volume={masterVolume} />
        </aside>

        <section className="order-1 flex flex-col gap-5 lg:order-2">
          <BeatVisualizer pattern={pattern} status={status} />

          <div className="border-border rounded-2xl border bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] px-3 py-7 shadow-[0_24px_70px_var(--shadow)] backdrop-blur sm:px-6 sm:py-9">
            <TransportControls
              onPause={() => getAudioEngine().pause()}
              onPlay={() => void play()}
              onStop={stop}
              status={status}
            />
            <div className="text-muted-strong mt-5 flex min-h-5 items-center justify-center gap-2 text-center text-sm font-semibold">
              <CircleDot aria-hidden="true" className="text-accent size-3" />
              <span data-testid="transport-status">{statusCopy[status]}</span>
            </div>
          </div>

          {showOnboarding ? (
            <aside
              className="border-accent/20 bg-accent/7 text-muted-strong flex items-start gap-3 rounded-xl border p-4 text-sm leading-6"
              role="note"
            >
              <Info
                aria-hidden="true"
                className="text-accent mt-0.5 size-5 shrink-0"
              />
              <p className="flex-1">
                Sound begins after you press Play because browsers require a
                direct interaction. You will hear one measure of count-in, then
                the groove.
              </p>
              <button
                aria-label="Dismiss audio tip"
                className="text-muted hover:bg-surface-hover hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors"
                onClick={dismissOnboarding}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </aside>
          ) : null}

          {errorMessage ? (
            <p
              className="border-danger/30 bg-danger/10 text-foreground rounded-xl border p-4 text-sm"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
        </section>

        <aside className="order-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <BpmControls
            bpm={bpm}
            defaultBpm={pattern.defaultBpm}
            onChange={changeBpm}
          />

          <section className="border-border bg-surface rounded-2xl border p-5">
            <div className="flex items-start gap-3">
              <span className="bg-secondary-accent/10 text-secondary-accent flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Clock3 aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-foreground font-bold">
                  One-measure count-in
                </p>
                <p className="text-muted mt-1 text-sm leading-5">
                  {pattern.timeSignature.numerator} synthesized clicks. The
                  first is accented.
                </p>
              </div>
            </div>
          </section>

          <Link
            className="border-border bg-surface text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold transition-colors sm:col-span-2 lg:col-span-1"
            href="/patterns"
          >
            <LibraryBig aria-hidden="true" className="size-4" />
            Browse all patterns
          </Link>
        </aside>
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {patternAnnouncement || statusCopy[status]}
      </p>
    </main>
  );
}
