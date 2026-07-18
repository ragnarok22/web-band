"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { usePracticeModal } from "@/hooks/use-practice-modal";

interface SavePracticePresetDialogProps {
  errorMessage: string | null;
  onClose: () => void;
  onSave: (name: string) => Promise<boolean>;
  open: boolean;
}

export function SavePracticePresetDialog({
  errorMessage,
  onClose,
  onSave,
  open,
}: SavePracticePresetDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  usePracticeModal(open);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function closeDialog(): void {
    dialogRef.current?.close();
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationMessage("Enter a preset name.");
      return;
    }
    setValidationMessage(null);
    setIsSaving(true);
    const saved = await onSave(trimmedName);
    setIsSaving(false);
    if (saved) closeDialog();
  }

  return (
    <dialog
      aria-labelledby={headingId}
      className="border-border bg-surface text-foreground fixed inset-0 m-auto w-[min(92vw,28rem)] rounded-2xl border p-0 shadow-[0_30px_100px_rgba(0,0,0,0.6)] backdrop:bg-black/75"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={() => {
        setName("");
        setValidationMessage(null);
        onClose();
      }}
      ref={dialogRef}
    >
      <form className="p-4 sm:p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-accent flex items-center gap-2 text-[0.65rem] font-extrabold tracking-[0.15em] uppercase">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Keep this groove
            </p>
            <h2
              className="mt-1 text-2xl font-black tracking-[-0.04em]"
              id={headingId}
            >
              Save practice preset
            </h2>
          </div>
          <button
            aria-label="Close save practice preset"
            className="text-muted hover:bg-surface-hover hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-xl"
            onClick={closeDialog}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <label
          className="text-muted-strong mt-5 block text-sm font-extrabold"
          htmlFor={inputId}
        >
          Preset name
        </label>
        <input
          autoFocus
          className="border-border bg-surface-elevated text-foreground placeholder:text-muted focus:border-accent mt-2 min-h-12 w-full rounded-xl border px-3 outline-none"
          id={inputId}
          maxLength={100}
          onChange={(event) => {
            setName(event.target.value);
            setValidationMessage(null);
          }}
          placeholder="e.g. Sunday warm-up"
          ref={inputRef}
          required
          value={name}
        />

        {validationMessage || errorMessage ? (
          <p
            className="border-danger/30 bg-danger/10 text-foreground mt-3 rounded-xl border p-3 text-sm"
            role="alert"
          >
            {validationMessage ?? errorMessage}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            className="border-border text-muted-strong hover:bg-surface-hover min-h-11 rounded-xl border px-3 text-sm font-extrabold"
            disabled={isSaving}
            onClick={closeDialog}
            type="button"
          >
            Cancel
          </button>
          <button
            className="bg-accent text-accent-ink hover:bg-accent-strong min-h-11 rounded-xl px-3 text-sm font-extrabold"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving…" : "Save preset"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
