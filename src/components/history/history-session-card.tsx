"use client";

import {
  ChevronDown,
  Drum,
  Guitar,
  MoreHorizontal,
  Timer,
  Trash2,
  AudioLines,
} from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HistorySessionDetails } from "@/components/history/history-session-details";
import {
  formatHistoryDuration,
  getHistorySessionBpm,
  getHistorySessionMetadata,
  getPracticeSessionTitle,
} from "@/lib/practice-history";
import type { PracticeSession } from "@/types/persistence";

const modeIcons = {
  drums: Drum,
  strumming: Guitar,
  chords: Guitar,
  tempoTrainer: Timer,
  metronome: AudioLines,
};
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export function HistorySessionCard({
  session,
  onDelete,
}: {
  session: PracticeSession;
  onDelete: (session: PracticeSession, trigger: HTMLElement | null) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const title = getPracticeSessionTitle(session);
  const Icon = modeIcons[session.practiceMode];
  return (
    <article className="border-border bg-surface hover:border-border-strong min-w-0 rounded-xl border p-4 transition-colors">
      <Collapsible>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
          <h4 className="flex min-w-0 items-center gap-2 text-sm font-extrabold sm:text-base">
            <Icon aria-hidden="true" className="text-primary size-4 shrink-0" />
            <span className="truncate">{title}</span>
          </h4>
          <p className="text-right text-sm font-extrabold tabular-nums">
            {formatHistoryDuration(session.durationSeconds)}
          </p>
          <p className="text-muted-foreground col-span-2 min-w-0 text-xs leading-5 break-words sm:col-span-1">
            {getHistorySessionMetadata(session)}
          </p>
          <p className="text-muted-strong col-span-2 text-xs font-semibold tabular-nums sm:col-span-1 sm:text-right">
            {getHistorySessionBpm(session)}
          </p>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <time
            className="text-muted-foreground text-xs"
            dateTime={session.startedAt}
          >
            {timeFormatter.format(new Date(session.startedAt))}
          </time>
          <div className="flex items-center gap-1">
            <CollapsibleTrigger
              render={
                <Button
                  className="group min-h-11 gap-1.5 px-3 text-xs"
                  variant="ghost"
                />
              }
              aria-label={`Details for ${title} session`}
            >
              Details{" "}
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 transition-transform group-aria-expanded:rotate-180"
              />
            </CollapsibleTrigger>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label={`More options for ${title} session`}
                    className="size-11 shrink-0"
                    ref={triggerRef}
                    size="icon"
                    variant="ghost"
                  />
                }
              >
                <MoreHorizontal aria-hidden="true" className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  className="min-h-11"
                  onClick={() => onDelete(session, triggerRef.current)}
                  variant="destructive"
                >
                  <Trash2 aria-hidden="true" />
                  Delete session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CollapsibleContent>
          <HistorySessionDetails session={session} />
        </CollapsibleContent>
      </Collapsible>
    </article>
  );
}
