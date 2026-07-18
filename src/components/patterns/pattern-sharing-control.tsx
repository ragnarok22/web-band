"use client";

import { Download, FileUp } from "lucide-react";
import { useRef, useState } from "react";

import { PatternShareDialog } from "@/components/patterns/pattern-share-dialog";
import { createPatternShareEnvelope } from "@/lib/pattern-sharing";
import {
  downloadPatternShareEnvelope,
  parsePatternShareFile,
} from "@/lib/pattern-sharing-browser";
import { usePatternStore } from "@/stores/pattern-store";
import type { PatternSharePreview } from "@/types/pattern-sharing";

function messageFromError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "The shared pattern file could not be imported.";
}

export function PatternSharingControl() {
  const customPatterns = usePatternStore((state) => state.customPatterns);
  const importPatterns = usePatternStore((state) => state.importPatterns);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<PatternSharePreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [isPending, setIsPending] = useState(false);
  const localPatternIds = new Set(customPatterns.map(({ id }) => id));
  const collisionCount = preview
    ? preview.envelope.data.patterns.filter(({ id }) => localPatternIds.has(id))
        .length
    : 0;

  function exportPatterns(): void {
    setErrorMessage(null);
    try {
      downloadPatternShareEnvelope(createPatternShareEnvelope(customPatterns));
      setAnnouncement(
        `Pattern export download started for ${customPatterns.length} ${customPatterns.length === 1 ? "pattern" : "patterns"}.`,
      );
    } catch (error) {
      setErrorMessage(messageFromError(error));
    }
  }

  async function chooseFile(file: File | undefined): Promise<void> {
    if (!file) return;
    setIsPending(true);
    setErrorMessage(null);
    setAnnouncement("");
    try {
      setPreview(await parsePatternShareFile(file));
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setIsPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function importSharedPatterns(): Promise<void> {
    if (!preview) return;
    setIsPending(true);
    setErrorMessage(null);
    try {
      const imported = await importPatterns(preview.envelope.data.patterns);
      const copied = imported.filter(
        ({ resolution }) => resolution === "copied",
      ).length;
      setAnnouncement(
        `Imported ${imported.length} ${imported.length === 1 ? "pattern" : "patterns"}.${copied > 0 ? ` ${copied} added as ${copied === 1 ? "a copy" : "copies"}.` : ""}`,
      );
      setPreview(null);
      window.setTimeout(() => importButtonRef.current?.focus());
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {customPatterns.length > 0 ? (
          <button
            className="border-border bg-surface text-muted-strong hover:border-border-strong hover:text-foreground flex min-h-12 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold"
            disabled={isPending}
            onClick={exportPatterns}
            type="button"
          >
            <Download aria-hidden="true" className="size-4" />
            Export my patterns
          </button>
        ) : null}
        <button
          className="border-border bg-surface text-muted-strong hover:border-border-strong hover:text-foreground flex min-h-12 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
          ref={importButtonRef}
          type="button"
        >
          <FileUp aria-hidden="true" className="size-4" />
          Import patterns
        </button>
        <input
          accept="application/json,.json"
          aria-label="Choose shared pattern file"
          className="sr-only"
          disabled={isPending}
          name="shared-pattern-file"
          onChange={(event) => void chooseFile(event.target.files?.[0])}
          ref={fileInputRef}
          type="file"
        />
      </div>
      {errorMessage && !preview ? (
        <p className="text-danger mt-2 max-w-md text-sm" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
      {preview ? (
        <PatternShareDialog
          collisionCount={collisionCount}
          errorMessage={errorMessage}
          isPending={isPending}
          onClose={() => {
            setPreview(null);
            setErrorMessage(null);
            importButtonRef.current?.focus();
          }}
          onImport={importSharedPatterns}
          preview={preview}
        />
      ) : null}
    </div>
  );
}
