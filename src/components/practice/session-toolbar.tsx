"use client";

import { Clock3, Focus, Keyboard, Sun } from "lucide-react";
import type { Ref } from "react";

import { formatPracticeDuration } from "@/hooks/use-practice-timer";
import type { WakeLockStatus } from "@/hooks/use-wake-lock";

interface SessionToolbarProps {
  elapsedSeconds: number;
  focusButtonRef?: Ref<HTMLButtonElement>;
  onFocus: () => void;
  onShortcuts: () => void;
  onWakeLockChange: (enabled: boolean) => void;
  wakeLockEnabled: boolean;
  wakeLockStatus: WakeLockStatus;
}

const wakeLockCopy: Record<WakeLockStatus, string> = {
  active: "Screen awake",
  error: "Wake Lock unavailable",
  idle: "Keep screen awake",
  requesting: "Requesting Wake Lock",
  unsupported: "Wake Lock unsupported",
};

export function SessionToolbar({
  elapsedSeconds,
  focusButtonRef,
  onFocus,
  onShortcuts,
  onWakeLockChange,
  wakeLockEnabled,
  wakeLockStatus,
}: SessionToolbarProps) {
  return (
    <section
      aria-label="Practice session tools"
      className="border-border bg-surface grid grid-cols-2 gap-2 rounded-xl border p-2 sm:grid-cols-[1fr_auto_auto_auto]"
    >
      <div className="bg-surface-elevated text-foreground flex min-h-11 items-center gap-2 rounded-lg px-3 font-black tabular-nums">
        <Clock3 aria-hidden="true" className="text-accent size-4" />
        <span
          aria-label={`Practice duration ${formatPracticeDuration(elapsedSeconds)}`}
        >
          {formatPracticeDuration(elapsedSeconds)}
        </span>
      </div>
      <button
        className="border-border text-muted-strong hover:bg-surface-hover hover:text-foreground flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-extrabold transition-colors"
        onClick={onFocus}
        ref={focusButtonRef}
        type="button"
      >
        <Focus aria-hidden="true" className="size-4" />
        Focus
      </button>
      <button
        aria-label="Open Shortcuts"
        className="border-border text-muted-strong hover:bg-surface-hover hover:text-foreground flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-extrabold transition-colors"
        onClick={onShortcuts}
        type="button"
      >
        <Keyboard aria-hidden="true" className="size-4" />
        Shortcuts
      </button>
      <button
        aria-pressed={wakeLockEnabled}
        className={`border-border flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-extrabold transition-colors ${wakeLockEnabled ? "bg-accent/10 text-accent" : "text-muted-strong hover:bg-surface-hover hover:text-foreground"}`}
        onClick={() => onWakeLockChange(!wakeLockEnabled)}
        title={wakeLockCopy[wakeLockStatus]}
        type="button"
      >
        <Sun aria-hidden="true" className="size-4" />
        Awake
      </button>
    </section>
  );
}
