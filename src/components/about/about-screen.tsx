import {
  ArrowDownUp,
  ArrowRight,
  AudioLines,
  ChevronDown,
  CloudOff,
  Drum,
  Gauge,
  Guitar,
  HardDrive,
  Timer,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { PracticeMode } from "@/types/practice";

const pulse = [
  "accent",
  "quiet",
  "quiet",
  "quiet",
  "backbeat",
  "quiet",
  "kick",
  "quiet",
  "accent",
  "quiet",
  "quiet",
  "quiet",
  "backbeat",
  "quiet",
  "kick",
  "quiet",
] as const;

const practiceFeatures = {
  drums: {
    description:
      "Play along with customizable drum rhythms across different musical styles.",
    icon: Drum,
    title: "Drum Grooves",
  },
  strumming: {
    description:
      "Follow visual strumming patterns and develop consistent right-hand rhythm.",
    icon: ArrowDownUp,
    title: "Strumming Practice",
  },
  chords: {
    description: "Practice chord changes with synchronized visual guidance.",
    icon: Guitar,
    title: "Chord Progressions",
  },
  tempoTrainer: {
    description:
      "Gradually increase or decrease your playing speed through structured exercises.",
    icon: Gauge,
    title: "Tempo Training",
  },
  metronome: {
    description:
      "Practice timing, accents, and rhythmic subdivisions with precise audio guidance.",
    icon: Timer,
    title: "Metronome",
  },
} satisfies Record<
  PracticeMode,
  { description: string; icon: LucideIcon; title: string }
>;

const practiceSteps = [
  [
    "01",
    "Choose Your Practice",
    "Select drum grooves, strumming, chords, tempo training, or metronome.",
  ],
  [
    "02",
    "Set Your Pace",
    "Choose a comfortable tempo and customize your practice settings.",
  ],
  ["03", "Press Play", "Follow the rhythm and focus on your playing."],
] as const;

const technicalDetails = [
  [
    "Accurate Musical Timing",
    "Tone.js schedules musical events against the audio clock, rather than relying on visual animation timing. The visuals follow the rhythm.",
  ],
  [
    "Synthesized Drum Sounds",
    "Drum sounds are generated in your browser with the Web Audio API instead of prerecorded drum samples.",
  ],
  [
    "Browser-Based Application",
    "Open Web Band in your browser and start practicing. No traditional desktop installation is needed.",
  ],
] as const;

export function AboutScreen() {
  return (
    <main className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-6xl space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-8">
      <header className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] lg:gap-10">
        <div className="min-w-0">
          <p className="text-primary text-xs font-extrabold tracking-[0.18em] uppercase">
            About Web Band
          </p>
          <h1 className="text-foreground mt-3 max-w-xl text-3xl leading-tight font-black tracking-[-0.045em] sm:text-4xl lg:text-5xl">
            Practice guitar.{" "}
            <span className="text-primary">Find your rhythm.</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-base leading-7">
            A complete rhythm practice companion for guitarists, right in your
            browser. Play along with drum grooves, chord progressions,
            strumming, tempo training, and a metronome.
          </p>
          <div className="mt-5">
            <PracticeActions />
          </div>
        </div>

        <div
          aria-hidden="true"
          className="border-border bg-surface w-full max-w-md rounded-2xl border p-4 sm:p-5 lg:justify-self-end"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-muted-foreground font-mono text-[0.65rem] font-bold tracking-[0.12em] uppercase">
                One bar / 4:4
              </p>
              <p className="text-foreground mt-1 text-sm font-extrabold">
                Rhythm, at your pace.
              </p>
            </div>
            <AudioLines className="text-primary size-5 shrink-0" />
          </div>
          <div className="mt-4 grid grid-cols-8 gap-1.5">
            {pulse.map((step, index) => (
              <span
                className={`h-7 rounded border sm:h-8 ${
                  step === "accent"
                    ? "border-primary bg-primary"
                    : step === "backbeat"
                      ? "border-secondary-accent/60 bg-secondary-accent/75"
                      : step === "kick"
                        ? "border-primary/40 bg-primary/25"
                        : "border-border bg-surface-elevated"
                }`}
                key={`${step}-${index}`}
              />
            ))}
          </div>
          <div className="text-muted-foreground mt-3 flex justify-between font-mono text-[0.65rem] font-bold tracking-[0.12em] uppercase">
            <span>Listen</span>
            <span>Count</span>
            <span>Play</span>
          </div>
        </div>
      </header>

      <section aria-labelledby="practice-features-heading">
        <h2
          className="text-foreground text-xl font-black tracking-[-0.035em] sm:text-2xl"
          id="practice-features-heading"
        >
          Everything you need to find your rhythm.
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {Object.values(practiceFeatures).map(
            ({ description, icon: Icon, title }) => (
              <li
                className="border-border bg-surface rounded-2xl border p-4 lg:col-span-2 lg:nth-4:col-start-2"
                key={title}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    aria-hidden="true"
                    className="text-primary size-5 shrink-0"
                  />
                  <h3 className="text-foreground text-sm font-extrabold">
                    {title}
                  </h3>
                </div>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {description}
                </p>
              </li>
            ),
          )}
        </ul>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          Save your practice setups as presets and revisit your sessions in
          practice history.
        </p>
      </section>

      <section aria-labelledby="practice-steps-heading">
        <h2
          className="text-foreground text-xl font-black tracking-[-0.035em] sm:text-2xl"
          id="practice-steps-heading"
        >
          From setup to practice in seconds.
        </h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3 md:gap-6">
          {practiceSteps.map(([number, title, description]) => (
            <li className="flex items-start gap-3" key={number}>
              <span
                aria-hidden="true"
                className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold"
              >
                {number}
              </span>
              <div>
                <h3 className="text-foreground text-sm leading-8 font-extrabold">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="local-data-heading"
        className="border-border bg-surface grid gap-5 rounded-2xl border p-4 sm:p-5 md:grid-cols-[1.25fr_1fr] md:gap-8"
      >
        <div>
          <div className="flex items-center gap-3">
            <HardDrive
              aria-hidden="true"
              className="text-primary size-5 shrink-0"
            />
            <h2
              className="text-foreground text-lg font-black tracking-[-0.025em]"
              id="local-data-heading"
            >
              Your practice. Your data.
            </h2>
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Your saved patterns, presets, and practice history are stored
            locally in this browser on your device. No account required.
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Browser storage can be cleared or unavailable, so keep a backup of
            the work you want to keep. Export or import backups in Settings.
          </p>
          <Link
            className="text-primary mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-extrabold underline-offset-4 hover:underline"
            href="/settings"
          >
            Manage backups in Settings
            <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
          </Link>
        </div>
        <div className="border-border border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <div className="flex items-center gap-3">
            <CloudOff
              aria-hidden="true"
              className="text-primary size-5 shrink-0"
            />
            <h3 className="text-foreground text-sm font-extrabold">
              Practice online or offline.
            </h3>
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Once the app and required resources are cached for offline use, you
            can continue practicing without an internet connection in a
            supported browser.
          </p>
        </div>
      </section>

      <Collapsible className="border-border rounded-2xl border">
        <h2>
          <CollapsibleTrigger className="group text-foreground flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-extrabold sm:px-5">
            How Web Band works
            <ChevronDown
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0 group-aria-expanded:rotate-180"
            />
          </CollapsibleTrigger>
        </h2>
        <CollapsibleContent>
          <div className="grid gap-4 px-4 pb-4 sm:px-5 sm:pb-5 md:grid-cols-3 md:gap-6">
            {technicalDetails.map(([title, description]) => (
              <div key={title}>
                <h3 className="text-foreground text-sm font-extrabold">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <section
        aria-labelledby="practice-cta-heading"
        className="bg-primary text-accent-ink flex flex-col gap-4 rounded-2xl p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
      >
        <div>
          <h2
            className="text-xl font-black tracking-[-0.035em] sm:text-2xl"
            id="practice-cta-heading"
          >
            Less reading. More playing.
          </h2>
          <p className="mt-1 text-sm leading-6">
            Pick a rhythm and start practicing.
          </p>
        </div>
        <PracticeActions variant="amber" />
      </section>
    </main>
  );
}

function PracticeActions({
  variant = "default",
}: {
  variant?: "default" | "amber";
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Link
        className={
          variant === "amber"
            ? "bg-accent-ink text-primary hover:bg-accent-ink/90 focus-visible:outline-accent-ink inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-extrabold transition-colors"
            : buttonVariants({
                className: "min-h-11 gap-2 px-4 font-extrabold",
              })
        }
        href="/practice"
      >
        Start Practicing
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
      <Link
        className={
          variant === "amber"
            ? "border-accent-ink/40 text-accent-ink hover:bg-accent-ink/8 focus-visible:outline-accent-ink inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-extrabold transition-colors"
            : buttonVariants({
                className: "min-h-11 px-4 font-extrabold",
                variant: "outline",
              })
        }
        href="/patterns"
      >
        Explore Grooves
      </Link>
    </div>
  );
}
