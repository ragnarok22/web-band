import { AudioLines } from "lucide-react";

import { formatPatternCategory } from "@/lib/pattern-filters";
import type { DrumPattern } from "@/types/pattern";

interface PatternSummaryProps {
  onPatternChange: (patternId: string) => void;
  pattern: DrumPattern;
  patterns: DrumPattern[];
  pendingPatternId: string | null;
  swing: number;
}

export function PatternSummary({
  onPatternChange,
  pattern,
  patterns,
  pendingPatternId,
  swing,
}: PatternSummaryProps) {
  return (
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
            onChange={(event) => onPatternChange(event.target.value)}
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
              {pattern.swing || swing > 0 ? "Swing" : "Straight"}{" "}
              {pattern.subdivision}ths
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
