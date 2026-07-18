interface ChordProgressionDeleteConfirmationProps {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ChordProgressionDeleteConfirmation({
  name,
  onCancel,
  onConfirm,
}: ChordProgressionDeleteConfirmationProps) {
  return (
    <div className="border-danger/30 bg-danger/10 mt-3 rounded-xl border p-3">
      <p className="text-foreground text-sm font-bold">
        Delete {name} permanently?
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          autoFocus
          className="border-border bg-surface-elevated text-muted-strong hover:border-border-strong hover:text-foreground min-h-11 rounded-lg border px-3 text-sm font-extrabold"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          aria-label={`Delete ${name} permanently`}
          className="bg-danger text-background min-h-11 rounded-lg px-3 text-sm font-black"
          onClick={onConfirm}
          type="button"
        >
          Delete progression
        </button>
      </div>
    </div>
  );
}
