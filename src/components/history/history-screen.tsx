"use client";

import { ArrowRight, MoreHorizontal, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HistoryActivityChart } from "@/components/history/history-activity-chart";
import { HistoryConfirmationDialog } from "@/components/history/history-confirmation-dialog";
import { HistoryRecentSessions } from "@/components/history/history-recent-sessions";
import { HistorySummary } from "@/components/history/history-summary";
import {
  defaultHistoryFilters,
  getHistoryActivity,
  getPracticeSessionTitle,
} from "@/lib/practice-history";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import type { PracticeSession } from "@/types/persistence";

// Refresh calendar-derived UI at local midnight and when returning to the page.
// This is a UI clock only; it does not track practice or affect audio timing.
function useHistoryDate(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function schedule(): void {
      clearTimeout(timeout);
      const current = new Date();
      const next = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      timeout = setTimeout(refresh, next.getTime() - current.getTime());
    }
    function refresh(): void {
      setNow(new Date());
      schedule();
    }
    function onVisibility(): void {
      if (document.visibilityState === "visible") refresh();
    }
    schedule();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return now;
}

export function HistoryScreen() {
  const sessions = usePracticeHistoryStore((state) => state.sessions);
  const isHydrated = usePracticeHistoryStore((state) => state.isHydrated);
  const isLoading = usePracticeHistoryStore((state) => state.isLoading);
  const errorMessage = usePracticeHistoryStore((state) => state.errorMessage);
  const [confirmation, setConfirmation] = useState<
    PracticeSession | "all" | null
  >(null);
  const [announcement, setAnnouncement] = useState("");
  const [filters, setFilters] = useState(defaultHistoryFilters);
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const pageHeadingRef = useRef<HTMLHeadingElement>(null);
  const now = useHistoryDate();
  const activity = useMemo(
    () => getHistoryActivity(sessions, now),
    [sessions, now],
  );
  function openConfirmation(
    value: PracticeSession | "all",
    trigger: HTMLElement | null,
  ): void {
    confirmationTriggerRef.current = trigger;
    setConfirmation(value);
  }
  function closeConfirmation(): void {
    const trigger = confirmationTriggerRef.current;
    setConfirmation(null);
    window.setTimeout(() => {
      if (trigger?.isConnected) trigger.focus();
      else pageHeadingRef.current?.focus();
    });
  }

  if (!isHydrated || isLoading) {
    return (
      <main className="text-muted-foreground flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 text-sm">
        <p aria-live="polite" role="status">
          Opening your practice journal
        </p>
      </main>
    );
  }
  return (
    <main className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[100rem] px-3 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="scroll-mt-24 text-2xl font-extrabold tracking-tight sm:text-3xl"
            ref={pageHeadingRef}
            tabIndex={-1}
          >
            Practice history
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Your progress, one session at a time.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label="More history options"
                className="min-h-11 min-w-11 shrink-0 gap-2"
                ref={moreTriggerRef}
                variant="outline"
              />
            }
          >
            <span className="hidden sm:inline">More</span>
            <MoreHorizontal aria-hidden="true" className="size-4" />
            <span className="sr-only sm:hidden">More history options</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              className="min-h-11"
              render={<Link href="/settings" />}
            >
              <ShieldCheck aria-hidden="true" />
              Backup &amp; restore
            </DropdownMenuItem>
            {sessions.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="min-h-11"
                  onClick={() =>
                    openConfirmation("all", moreTriggerRef.current)
                  }
                  variant="destructive"
                >
                  <Trash2 aria-hidden="true" />
                  Clear all history
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {errorMessage ? (
        <p
          className="border-danger/30 bg-danger/10 mb-5 rounded-xl border p-4 text-sm"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      {sessions.length === 0 ? (
        <section className="border-border bg-surface rounded-xl border px-5 py-10 text-center sm:py-12">
          <h2 className="text-xl font-extrabold tracking-tight">
            Your practice journey starts here.
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6">
            Complete a practice session to start building your history.
          </p>
          <Link
            className="bg-primary text-accent-ink mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-bold"
            href="/practice"
          >
            Start practicing
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
      ) : (
        <div className="space-y-7">
          <HistorySummary sessions={sessions} now={now} />
          <HistoryActivityChart days={activity} />
          <HistoryRecentSessions
            sessions={sessions}
            now={now}
            filters={filters}
            onFiltersChange={setFilters}
            onDelete={openConfirmation}
          />
        </div>
      )}

      <section
        aria-labelledby="history-backup-heading"
        className="border-border mt-7 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-sm font-bold" id="history-backup-heading">
            Backup &amp; restore
          </h2>
          <p className="text-muted-foreground mt-1 max-w-xl text-xs leading-5">
            Export or restore your locally saved Web Band data, including
            sessions, patterns, presets, and preferences.
          </p>
        </div>
        <Link
          className="text-primary inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-lg text-sm font-semibold"
          href="/settings"
        >
          Manage backups in Settings
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>

      {confirmation === "all" ? (
        <HistoryConfirmationDialog
          confirmLabel="Clear all"
          description="Every locally saved practice session will be removed from this device. Patterns, presets, and preferences are kept. This cannot be undone."
          heading="Clear practice history?"
          onClose={closeConfirmation}
          onConfirm={async () => {
            await usePracticeHistoryStore.getState().clearAll();
            setAnnouncement("Practice history cleared.");
          }}
        />
      ) : null}
      {confirmation && confirmation !== "all" ? (
        <HistoryConfirmationDialog
          confirmLabel="Delete session"
          description={`Remove the ${getPracticeSessionTitle(confirmation)} session from your local practice history? This cannot be undone.`}
          heading="Delete this session?"
          onClose={closeConfirmation}
          onConfirm={async () => {
            await usePracticeHistoryStore.getState().deleteOne(confirmation.id);
            setAnnouncement(
              `${getPracticeSessionTitle(confirmation)} session deleted.`,
            );
          }}
        />
      ) : null}
    </main>
  );
}
