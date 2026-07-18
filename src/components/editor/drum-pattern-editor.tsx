"use client";

import { LibraryBig, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/editor/confirmation-dialog";
import { DrumPatternGrid } from "@/components/editor/drum-pattern-grid";
import { EditorHeader } from "@/components/editor/editor-header";
import { PatternEditorFields } from "@/components/editor/pattern-editor-fields";
import { builtInPatterns } from "@/data/patterns";
import { useEditorPlayback } from "@/hooks/use-editor-playback";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  clearPattern,
  createDefaultPatternDraft,
  duplicatePatternDraft,
} from "@/lib/drum-pattern-editor";
import { validateCustomDrumPattern } from "@/lib/persistence-validation";
import { usePatternStore } from "@/stores/pattern-store";
import type { CustomDrumPattern } from "@/types/persistence";

interface LoadError {
  description: string;
  duplicateId?: string;
  title: string;
}

type Confirmation = "clear" | "delete" | null;

export function DrumPatternEditor() {
  const searchParams = useSearchParams();
  const customPatterns = usePatternStore((state) => state.customPatterns);
  const isHydrated = usePatternStore((state) => state.isHydrated);
  const patternQuery = searchParams.get("pattern");
  const duplicateQuery = searchParams.get("duplicate");

  if (!isHydrated) return <EditorLoading />;
  if (patternQuery && duplicateQuery) {
    return (
      <EditorMissing
        error={{
          description:
            "Open one pattern at a time, either for editing or duplication.",
          title: "Choose one editor action",
        }}
      />
    );
  }

  const unavailableIds = [
    ...builtInPatterns.map(({ id }) => id),
    ...customPatterns.map(({ id }) => id),
  ];
  if (patternQuery) {
    const custom = customPatterns.find(({ id }) => id === patternQuery);
    if (custom) {
      return (
        <PatternEditorSession
          initialDraft={custom}
          initialSourcePatternId={custom.id}
          key={`pattern:${custom.id}`}
        />
      );
    }
    const builtIn = builtInPatterns.find(({ id }) => id === patternQuery);
    return (
      <EditorMissing
        error={
          builtIn
            ? {
                description:
                  "Factory grooves stay read-only. Duplicate this groove to make it yours.",
                duplicateId: builtIn.id,
                title: "Built-in patterns cannot be edited",
              }
            : {
                description:
                  "This custom pattern may have been deleted or belongs to another browser.",
                title: "Pattern not found",
              }
        }
      />
    );
  }

  if (duplicateQuery) {
    const source = [...builtInPatterns, ...customPatterns].find(
      ({ id }) => id === duplicateQuery,
    );
    if (!source) {
      return (
        <EditorMissing
          error={{
            description:
              "Return to the library and choose another groove to duplicate.",
            title: "Source pattern not found",
          }}
        />
      );
    }
    return (
      <PatternEditorSession
        initialDraft={duplicatePatternDraft(source, unavailableIds)}
        initialSourcePatternId={null}
        key={`duplicate:${source.id}`}
      />
    );
  }

  return (
    <PatternEditorSession
      initialDraft={createDefaultPatternDraft(unavailableIds)}
      initialSourcePatternId={null}
      key="new"
    />
  );
}

interface PatternEditorSessionProps {
  initialDraft: CustomDrumPattern;
  initialSourcePatternId: string | null;
}

function PatternEditorSession({
  initialDraft,
  initialSourcePatternId,
}: PatternEditorSessionProps) {
  const router = useRouter();
  const createPattern = usePatternStore((state) => state.create);
  const deletePattern = usePatternStore((state) => state.delete);
  const updatePattern = usePatternStore((state) => state.update);
  const [draft, setDraft] = useState(() => structuredClone(initialDraft));
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialDraft));
  const [sourcePatternId, setSourcePatternId] = useState(
    initialSourcePatternId,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const playback = useEditorPlayback(draft);
  const validation = validateCustomDrumPattern(draft);
  const isDirty = Boolean(
    !sourcePatternId || JSON.stringify(draft) !== baseline,
  );
  useUnsavedChangesGuard(isDirty);

  function changeDraft(pattern: CustomDrumPattern): void {
    setDraft(pattern);
    setErrorMessage(null);
    setStatusMessage(null);
  }

  async function save(): Promise<void> {
    const normalized = {
      ...draft,
      description: draft.description.trim(),
      name: draft.name.trim(),
    };
    const result = validateCustomDrumPattern(normalized);
    if (!result.success) {
      setErrorMessage(result.errors.join(" "));
      setStatusMessage(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = sourcePatternId
        ? await updatePattern(sourcePatternId, normalized)
        : await createPattern(normalized);
      setDraft(saved);
      setBaseline(JSON.stringify(saved));
      setSourcePatternId(saved.id);
      setStatusMessage("Pattern saved locally.");
      router.replace(`/editor?pattern=${encodeURIComponent(saved.id)}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Pattern could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeSavedPattern(): Promise<void> {
    if (!sourcePatternId) return;
    try {
      await deletePattern(sourcePatternId);
      router.push("/patterns");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pattern could not be deleted.",
      );
      throw error;
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[100rem] overflow-x-clip px-3 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
      <EditorHeader
        onPlay={() =>
          void playback
            .togglePlayback()
            .catch((error) =>
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : "Playback could not start.",
              ),
            )
        }
        onSave={() => void save()}
        status={{
          dirty: isDirty,
          playing: playback.isPlaying,
          saving: isSaving,
          valid: validation.success,
        }}
      />

      <div className="grid gap-5">
        <PatternEditorFields
          disabled={isSaving}
          onChange={changeDraft}
          pattern={draft}
        />
        <DrumPatternGrid
          activeStep={playback.activeStep}
          disabled={isSaving}
          onChange={changeDraft}
          pattern={draft}
        />
        <section className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div aria-live="polite">
            <p className="text-sm font-extrabold">
              {statusMessage ??
                (isDirty
                  ? "Ready for your next edit."
                  : "Pattern saved locally.")}
            </p>
            <p className="text-muted mt-1 text-xs">
              Patterns stay in this browser and appear in your groove library.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="border-border text-muted-strong hover:text-foreground flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold"
              onClick={() => setConfirmation("clear")}
              type="button"
            >
              <XCircle aria-hidden="true" className="size-4" />
              Clear pattern
            </button>
            {sourcePatternId ? (
              <button
                className="border-danger/35 text-danger hover:bg-danger/10 flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-extrabold"
                onClick={() => setConfirmation("delete")}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Delete pattern
              </button>
            ) : null}
          </div>
        </section>
      </div>

      {errorMessage || playback.audioError ? (
        <p
          className="border-danger/35 bg-danger/10 text-foreground fixed right-4 bottom-24 z-30 max-w-[calc(100vw-2rem)] rounded-xl border p-4 text-sm [overflow-wrap:anywhere] break-words shadow-xl lg:bottom-5 lg:max-w-md"
          role="alert"
        >
          {errorMessage ?? playback.audioError}
        </p>
      ) : null}

      {confirmation === "clear" ? (
        <ConfirmationDialog
          confirmLabel="Clear all hits"
          description="This removes every hit from the draft. Pattern details stay intact."
          heading="Clear this pattern?"
          onClose={() => setConfirmation(null)}
          onConfirm={() => {
            changeDraft(clearPattern(draft));
          }}
        />
      ) : null}
      {confirmation === "delete" ? (
        <ConfirmationDialog
          confirmLabel="Delete pattern"
          description="This removes the pattern and its favorite status from this browser."
          destructive
          heading={`Delete ${draft.name}?`}
          onClose={() => setConfirmation(null)}
          onConfirm={removeSavedPattern}
        />
      ) : null}
    </main>
  );
}

function EditorLoading() {
  return (
    <main className="text-muted flex min-h-screen items-center justify-center text-sm font-extrabold tracking-wider uppercase">
      Setting up the pattern workshop
    </main>
  );
}

function EditorMissing({ error }: { error: LoadError }) {
  return (
    <main className="mx-auto flex min-h-[80dvh] max-w-2xl items-center px-5">
      <section className="border-border bg-surface w-full rounded-3xl border p-7 text-center sm:p-10">
        <LibraryBig aria-hidden="true" className="text-accent mx-auto size-9" />
        <h1 className="mt-4 text-3xl font-black">{error.title}</h1>
        <p className="text-muted mx-auto mt-3 max-w-lg leading-7">
          {error.description}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            className="border-border text-muted-strong flex min-h-11 items-center rounded-xl border px-4 text-sm font-extrabold"
            href="/patterns"
          >
            Return to patterns
          </Link>
          {error.duplicateId ? (
            <Link
              className="bg-accent text-accent-ink flex min-h-11 items-center rounded-xl px-4 text-sm font-extrabold"
              href={`/editor?duplicate=${encodeURIComponent(error.duplicateId)}`}
            >
              Duplicate instead
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
