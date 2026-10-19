import type { ReactNode } from "react";
import { audioStatusCopy } from "@/lib/audio-status";
import type { AudioEngineStatus } from "@/types/audio";

export function PracticeHeader({
  actions,
  status,
}: {
  actions: ReactNode;
  status: AudioEngineStatus;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-5 sm:py-6">
      <div>
        <h1 className="text-foreground text-xl font-extrabold tracking-tight sm:text-2xl">
          Practice room
        </h1>
        <p className="text-muted-strong mt-1 flex items-center gap-2 text-xs">
          <span
            aria-hidden="true"
            className={`size-1.5 rounded-full ${status === "playing" ? "bg-success" : status === "counting-in" ? "bg-secondary-accent" : "bg-muted-foreground"}`}
          />
          {audioStatusCopy[status]}
        </p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
    </header>
  );
}
