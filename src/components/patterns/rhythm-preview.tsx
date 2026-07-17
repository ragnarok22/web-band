import { getStepsPerBar } from "@/lib/musical-time";
import type { DrumInstrument, DrumPattern } from "@/types/pattern";

interface RhythmPreviewProps {
  pattern: DrumPattern;
}

const rows: Array<{ instruments: DrumInstrument[]; label: string }> = [
  { instruments: ["closedHat", "openHat", "ride"], label: "Top" },
  { instruments: ["snare", "rim", "clap"], label: "Backbeat" },
  { instruments: ["kick"], label: "Kick" },
];

export function RhythmPreview({ pattern }: RhythmPreviewProps) {
  const stepCount = getStepsPerBar(pattern.timeSignature, pattern.subdivision);

  return (
    <div
      aria-label={`${pattern.name} rhythm preview`}
      className="space-y-1.5"
      role="img"
    >
      {rows.map((row) => (
        <div className="flex items-center gap-2" key={row.label}>
          <span className="text-muted w-12 text-[0.62rem] font-bold tracking-wide uppercase">
            {row.label}
          </span>
          <span
            aria-hidden="true"
            className="grid flex-1 gap-1"
            style={{
              gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: stepCount }, (_, step) => {
              const hit = pattern.hits.find(
                (candidate) =>
                  candidate.step === step &&
                  row.instruments.includes(candidate.instrument),
              );
              return (
                <span
                  className={`h-2 rounded-[0.15rem] ${hit ? (hit.velocity >= 0.8 ? "bg-accent" : "bg-accent/45") : "bg-surface-hover"}`}
                  key={step}
                />
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
