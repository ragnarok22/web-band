import {
  ArrowRight,
  AudioLines,
  CloudOff,
  Drum,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

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

const principles = [
  {
    description:
      "Tone Transport owns the pulse. Visuals follow the sound, never the other way around.",
    eyebrow: "01 / Timing",
    icon: AudioLines,
    title: "The pocket comes first.",
  },
  {
    description:
      "Every kick, snare, hat, tom, and cymbal is synthesized when you play. There are no hidden recordings.",
    eyebrow: "02 / Sound",
    icon: Drum,
    title: "Made now, not played back.",
  },
  {
    description:
      "Patterns, presets, and practice history stay in this browser unless you choose to export them.",
    eyebrow: "03 / Privacy",
    icon: ShieldCheck,
    title: "Your practice stays yours.",
  },
] as const;

const signalPath = [
  ["01", "Press Play", "A direct gesture wakes the browser audio context."],
  ["02", "Set the pulse", "Tone schedules the meter, tempo, and groove ahead."],
  [
    "03",
    "Build the kit",
    "Web Audio shapes each drum hit from oscillators and noise.",
  ],
  [
    "04",
    "Fill the room",
    "Sound and visual guidance arrive on the same musical clock.",
  ],
] as const;

export function AboutScreen() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[88rem] overflow-x-clip px-4 py-8 sm:px-7 sm:py-12 lg:px-10 lg:py-16">
      <header className="border-border relative isolate overflow-hidden border-b pb-12 sm:pb-16 lg:pb-20">
        <div
          aria-hidden="true"
          className="bg-accent/8 absolute -top-32 right-[-12rem] -z-10 size-[32rem] rounded-full blur-3xl"
        />
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.72fr)] lg:items-end lg:gap-16">
          <div>
            <p className="text-accent flex items-center gap-2 text-xs font-extrabold tracking-[0.2em] uppercase">
              <Drum aria-hidden="true" className="size-4" />
              About Web Band
            </p>
            <h1 className="text-foreground mt-5 max-w-4xl text-5xl leading-[0.94] font-black tracking-[-0.065em] sm:text-7xl lg:text-[6.4rem]">
              A drum room without the room.
            </h1>
            <p className="text-muted mt-7 max-w-2xl text-base leading-8 sm:text-lg">
              Web Band is a browser-built rhythm section for guitarists who want
              to press Play, find the pocket, and get back to practicing. No
              setup ritual. No account. No samples.
            </p>
          </div>

          <div className="border-border bg-surface/75 relative rounded-[2rem] border p-5 shadow-[0_24px_80px_var(--shadow)] sm:p-7">
            <div className="border-border flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-accent text-[0.65rem] font-extrabold tracking-[0.18em] uppercase">
                  One bar / 4:4
                </p>
                <p className="text-foreground mt-1 text-sm font-extrabold">
                  Built in the browser
                </p>
              </div>
              <AudioLines aria-hidden="true" className="text-muted size-5" />
            </div>
            <div
              aria-label="A sixteen-step rhythm with accented beats"
              className="mt-7 grid grid-cols-8 gap-2"
              role="img"
            >
              {pulse.map((step, index) => (
                <span
                  className={`h-14 rounded-md border sm:h-16 ${
                    step === "accent"
                      ? "border-accent bg-accent shadow-[0_0_24px_rgba(231,169,75,0.3)]"
                      : step === "backbeat"
                        ? "border-secondary-accent/60 bg-secondary-accent/75"
                        : step === "kick"
                          ? "border-accent/40 bg-accent/25"
                          : "border-border bg-surface-elevated"
                  }`}
                  key={`${step}-${index}`}
                />
              ))}
            </div>
            <div className="text-muted mt-5 flex items-center justify-between font-mono text-[0.65rem] font-bold tracking-[0.15em] uppercase">
              <span>Click</span>
              <span>Count</span>
              <span>Groove</span>
            </div>
          </div>
        </div>

        <dl className="border-border mt-12 grid grid-cols-2 border-y sm:grid-cols-4">
          {[
            ["0", "audio files"],
            ["44", "built-in grooves"],
            ["7", "supported meters"],
            ["100%", "local-first"],
          ].map(([value, label]) => (
            <div
              className="border-border px-3 py-5 text-center even:border-l sm:border-l sm:first:border-l-0"
              key={label}
            >
              <dt className="text-foreground font-mono text-2xl font-black tabular-nums sm:text-3xl">
                {value}
              </dt>
              <dd className="text-muted mt-1 text-[0.65rem] font-extrabold tracking-[0.14em] uppercase">
                {label}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <section aria-labelledby="principles-heading" className="py-14 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.58fr_1.42fr] lg:gap-16">
          <div>
            <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
              Three principles
            </p>
            <h2
              className="text-foreground mt-3 text-3xl font-black tracking-[-0.05em] sm:text-5xl"
              id="principles-heading"
            >
              Built like an instrument.
            </h2>
            <p className="text-muted mt-5 max-w-md leading-7">
              The interface is deliberately smaller than a drum machine. The
              engineering underneath it is not.
            </p>
          </div>
          <div className="divide-border border-border divide-y border-y">
            {principles.map(({ description, eyebrow, icon: Icon, title }) => (
              <article
                className="grid gap-4 py-7 sm:grid-cols-[3rem_1fr] sm:gap-6 sm:py-9"
                key={eyebrow}
              >
                <span className="border-accent/25 bg-accent/10 text-accent flex size-11 items-center justify-center rounded-xl border">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-muted text-[0.65rem] font-extrabold tracking-[0.16em] uppercase">
                    {eyebrow}
                  </p>
                  <h3 className="text-foreground mt-2 text-2xl font-black tracking-[-0.035em]">
                    {title}
                  </h3>
                  <p className="text-muted mt-2 max-w-2xl leading-7">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="signal-path-heading"
        className="border-border bg-surface/55 relative overflow-hidden rounded-[2rem] border px-5 py-8 sm:px-8 sm:py-10 lg:px-10"
      >
        <div
          aria-hidden="true"
          className="from-accent via-secondary-accent absolute inset-y-0 left-0 w-1 bg-gradient-to-b to-transparent"
        />
        <div className="border-border flex flex-col gap-4 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
              Signal path
            </p>
            <h2
              className="text-foreground mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl"
              id="signal-path-heading"
            >
              From one tap to the pocket.
            </h2>
          </div>
          <p className="text-muted max-w-md text-sm leading-6">
            The musical clock stays outside React so controls and animation can
            move without moving the beat.
          </p>
        </div>
        <ol className="grid lg:grid-cols-4">
          {signalPath.map(([number, title, description], index) => (
            <li
              className={`border-border py-6 lg:px-6 lg:py-8 ${index > 0 ? "border-t lg:border-t-0 lg:border-l" : "lg:pl-0"}`}
              key={number}
            >
              <span className="text-accent font-mono text-xs font-black">
                {number}
              </span>
              <h3 className="text-foreground mt-4 text-lg font-black">
                {title}
              </h3>
              <p className="text-muted mt-2 text-sm leading-6">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-6 py-14 sm:py-20 lg:grid-cols-[1fr_0.8fr] lg:items-stretch">
        <div className="border-border bg-background/40 rounded-[2rem] border p-6 sm:p-9">
          <CloudOff aria-hidden="true" className="text-accent size-7" />
          <h2 className="text-foreground mt-6 text-3xl font-black tracking-[-0.045em]">
            The room travels with the browser.
          </h2>
          <p className="text-muted mt-4 max-w-2xl leading-7">
            Once installed, the practice room, groove library, editor, history,
            settings, and this page work offline. Your saved work remains on the
            device, with JSON backup when you want to move it.
          </p>
          <div className="text-muted-strong mt-7 flex items-center gap-3 text-sm font-extrabold">
            <HardDrive aria-hidden="true" className="text-accent size-5" />
            IndexedDB for your work. No cloud account required.
          </div>
        </div>

        <div className="bg-accent text-accent-ink flex flex-col justify-between rounded-[2rem] p-6 sm:p-9">
          <div>
            <p className="text-xs font-extrabold tracking-[0.18em] uppercase">
              Ready when you are
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] sm:text-5xl">
              Less reading. More playing.
            </h2>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Link
              className="bg-accent-ink text-accent flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold"
              href="/practice"
            >
              Start practicing
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              className="border-accent-ink/25 hover:bg-accent-ink/8 flex min-h-12 items-center justify-center rounded-xl border px-5 text-sm font-extrabold transition-colors"
              href="/patterns"
            >
              Explore grooves
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
