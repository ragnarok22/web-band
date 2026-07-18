"use client";

import { ArrowRight, BookOpen, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { DataBackupPanel } from "@/components/data/data-backup-panel";
import { HistoryConfirmationDialog } from "@/components/history/history-confirmation-dialog";
import { HistorySessionList } from "@/components/history/history-session-list";
import { HistorySummary } from "@/components/history/history-summary";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import type { PracticeSession } from "@/types/persistence";

export function HistoryScreen() {
  const sessions = usePracticeHistoryStore((state) => state.sessions);
  const isHydrated = usePracticeHistoryStore((state) => state.isHydrated);
  const isLoading = usePracticeHistoryStore((state) => state.isLoading);
  const errorMessage = usePracticeHistoryStore((state) => state.errorMessage);
  const [confirmation, setConfirmation] = useState<
    PracticeSession | "all" | null
  >(null);
  const [announcement, setAnnouncement] = useState("");
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  const pageHeadingRef = useRef<HTMLHeadingElement>(null);

  function openConfirmation(value: PracticeSession | "all"): void {
    confirmationTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
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
      <main className="text-muted flex min-h-screen items-center justify-center px-5 text-sm font-bold tracking-wider uppercase">
        <p aria-live="polite" role="status">
          Opening your practice journal
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[82rem] overflow-x-clip px-4 py-8 sm:px-7 sm:py-12 lg:px-10 lg:py-16">
      <header className="border-border relative overflow-hidden border-b pb-9 sm:pb-12">
        <span
          aria-hidden="true"
          className="bg-accent/6 absolute -top-20 right-0 size-64 rounded-full blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-accent flex items-center gap-2 text-xs font-extrabold tracking-[0.2em] uppercase">
              <BookOpen aria-hidden="true" className="size-4" />
              Practice journal
            </p>
            <h1
              className="text-foreground mt-3 max-w-2xl text-4xl font-black tracking-[-0.055em] sm:text-6xl"
              ref={pageHeadingRef}
              tabIndex={-1}
            >
              The work you put in.
            </h1>
            <p className="text-muted mt-4 max-w-xl text-sm leading-6 sm:text-base">
              A quiet record of the grooves, tempos, and minutes practiced on
              this device.
            </p>
          </div>
          {sessions.length > 0 ? (
            <button
              className="border-border text-muted-strong hover:border-danger/40 hover:text-danger flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border px-4 text-sm font-extrabold transition-colors sm:self-auto"
              onClick={() => openConfirmation("all")}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Clear all history
            </button>
          ) : null}
        </div>
      </header>

      {errorMessage ? (
        <p
          aria-live="polite"
          className="border-danger/30 bg-danger/10 mt-6 rounded-xl border p-4 text-sm"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      {sessions.length === 0 ? (
        <section className="border-border bg-surface/60 mx-auto mt-12 max-w-2xl rounded-3xl border px-6 py-14 text-center sm:px-12">
          <span className="border-accent/20 bg-accent/8 text-accent mx-auto flex size-16 items-center justify-center rounded-2xl border">
            <BookOpen aria-hidden="true" className="size-7" />
          </span>
          <h2 className="mt-6 text-3xl font-black tracking-[-0.04em]">
            No sessions yet
          </h2>
          <p className="text-muted mx-auto mt-3 max-w-md leading-7">
            Play a meaningful session in the practice room and it will settle
            here as your first journal entry.
          </p>
          <Link
            className="bg-accent text-accent-ink mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-sm font-extrabold"
            href="/practice"
          >
            Start practicing
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
      ) : (
        <div className="space-y-14 pt-10 sm:pt-12">
          <HistorySummary sessions={sessions} />
          <section aria-labelledby="recent-sessions-heading">
            <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
              Journal entries
            </p>
            <h2
              className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-3xl"
              id="recent-sessions-heading"
            >
              Recent sessions
            </h2>
            <HistorySessionList
              onDelete={openConfirmation}
              sessions={sessions}
            />
          </section>
        </div>
      )}

      <DataBackupPanel compact />

      {confirmation === "all" ? (
        <HistoryConfirmationDialog
          confirmLabel="Clear all"
          description="Every locally saved practice session will be removed from this device. This cannot be undone."
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
          description={`Remove the ${confirmation.patternName} session from your local journal? This cannot be undone.`}
          heading="Delete this session?"
          onClose={closeConfirmation}
          onConfirm={async () => {
            await usePracticeHistoryStore.getState().deleteOne(confirmation.id);
            setAnnouncement(`${confirmation.patternName} session deleted.`);
          }}
        />
      ) : null}
    </main>
  );
}
