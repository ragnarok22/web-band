"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";

import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const headingId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  function closeDialog(): void {
    setName("");
    setValidationMessage(null);
    onClose();
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
    try {
      const saved = await onSave(trimmedName);
      if (saved) closeDialog();
    } catch (error) {
      setValidationMessage(
        error instanceof Error
          ? error.message
          : "Practice preset could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      aria-labelledby={headingId}
      className="p-0 sm:max-w-md"
      open={open}
      busy={isSaving}
      onClose={closeDialog}
      initialFocus={inputRef}
    >
      <form className="p-4 sm:p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-primary flex items-center gap-2 text-[0.65rem] font-extrabold tracking-[0.15em] uppercase">
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
          <Button
            variant="ghost"
            size="icon"
            disabled={isSaving}
            aria-label="Close save practice preset"
            className="size-11"
            onClick={closeDialog}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        <label
          className="text-muted-strong mt-5 block text-sm font-extrabold"
          htmlFor={inputId}
        >
          Preset name
        </label>
        <Input
          autoFocus
          className="mt-2 min-h-12"
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
          <Button
            variant="outline"
            className="min-h-11"
            disabled={isSaving}
            onClick={closeDialog}
            type="button"
          >
            Cancel
          </Button>
          <Button className="min-h-11" disabled={isSaving} type="submit">
            {isSaving ? "Saving…" : "Save preset"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
