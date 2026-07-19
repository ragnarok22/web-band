import { strumActionDetails } from "@/components/practice/strum-action-details";
import { getBeatLabels } from "@/lib/musical-time";
import type { StrummingPattern } from "@/types/practice";

interface StrummingSequenceProps {
  activeStepId?: string | null;
  className?: string;
  pattern: StrummingPattern;
}

export function StrummingSequence({
  activeStepId = null,
  className = "",
  pattern,
}: StrummingSequenceProps) {
  const labels = getBeatLabels(pattern);

  return (
    <ol
      aria-label={`${pattern.name} action sequence`}
      className={`grid grid-cols-4 gap-2 min-[420px]:grid-cols-8 ${className}`}
    >
      {pattern.steps.map((step, index) => {
        const details = strumActionDetails[step.action];
        const label = labels[step.subdivisionIndex] ?? String(index + 1);
        const isActive = step.id === activeStepId;
        return (
          <li
            aria-current={isActive ? "step" : undefined}
            aria-label={`Step ${index + 1}, position ${label}: ${details.label}${step.accent ? ", accent" : ""}`}
            className={`flex min-h-20 min-w-0 flex-col items-center justify-center rounded-lg border px-1 py-2 transition-[background-color,border-color,box-shadow,color] ${
              isActive
                ? "border-accent bg-accent/15 text-accent shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_25%,transparent)]"
                : step.accent
                  ? "border-accent/60 bg-surface-elevated text-accent"
                  : "border-border bg-surface-elevated text-foreground"
            }`}
            data-position={label}
            key={step.id}
          >
            <span className="text-muted text-[0.62rem] leading-none font-black tabular-nums">
              {label}
            </span>
            <span
              aria-hidden="true"
              className="mt-1 text-xl leading-none font-black"
            >
              {details.symbol}
            </span>
            <span className="text-muted-strong mt-1 truncate text-[0.58rem] font-extrabold uppercase">
              {details.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
