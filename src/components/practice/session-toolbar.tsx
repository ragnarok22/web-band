"use client";

import { Clock3, Focus, Keyboard } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPracticeDuration } from "@/hooks/use-practice-timer";

export function SessionToolbar({
  elapsedSeconds,
  focusButtonRef,
  onFocus,
  onShortcuts,
}: {
  elapsedSeconds: number;
  focusButtonRef?: Ref<HTMLButtonElement>;
  onFocus: () => void;
  onShortcuts: () => void;
}) {
  return (
    <section
      aria-label="Practice session tools"
      className="flex flex-wrap items-center gap-1"
    >
      <div className="text-foreground mr-1 flex min-h-11 items-center gap-1.5 text-sm font-extrabold tabular-nums">
        <Clock3 aria-hidden="true" className="size-4" />
        <span className="sr-only">Practice duration </span>
        {formatPracticeDuration(elapsedSeconds)}
      </div>
      <Button
        variant="ghost"
        className="min-h-11 gap-2 px-2"
        onClick={onFocus}
        ref={focusButtonRef}
      >
        <Focus aria-hidden="true" className="size-4" />
        Focus
      </Button>
      <Tooltip>
        <TooltipTrigger
          aria-label="Open Shortcuts"
          render={
            <Button variant="ghost" className="size-11" onClick={onShortcuts} />
          }
        >
          <Keyboard aria-hidden="true" className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
      </Tooltip>
    </section>
  );
}
