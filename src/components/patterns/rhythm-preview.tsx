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
      className="space-y-1"
      role="img"
    >
      {rows.map((row) => (
        <div className="flex items-center gap-2" key={row.label}>
          <span className="text-muted-foreground w-14 shrink-0 text-[0.625rem] font-medium">
            {row.label}
          </span>
          <span
            aria-hidden="true"
            className="grid min-w-0 flex-1 gap-0.5"
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
                  className={`h-1.5 rounded-[0.125rem] ${hit ? (hit.velocity >= 0.8 ? "bg-primary" : "bg-primary/45") : "bg-surface-hover"}`}
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
