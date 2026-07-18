import { Drum } from "lucide-react";

import { audioStatusCopy } from "@/lib/audio-status";
import type { AudioEngineStatus } from "@/types/audio";

interface PracticeHeaderProps {
  status: AudioEngineStatus;
}

export function PracticeHeader({ status }: PracticeHeaderProps) {
  return (
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
        <span className="hidden sm:inline">{audioStatusCopy[status]}</span>
        <span className="sm:hidden">{status.replace("-", " ")}</span>
      </div>
    </header>
  );
}
