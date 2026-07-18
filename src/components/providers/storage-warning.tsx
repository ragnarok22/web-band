"use client";

import { AlertTriangle } from "lucide-react";

import { useStorageStore } from "@/stores/storage-store";

export function StorageWarning() {
  const warning = useStorageStore((state) => state.warning);

  if (!warning) {
    return null;
  }

  return (
    <aside
      aria-live="polite"
      className="border-secondary-accent/40 bg-surface-elevated text-foreground pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 text-sm shadow-2xl"
      role="status"
    >
      <AlertTriangle
        aria-hidden="true"
        className="text-secondary-accent mt-0.5 size-5 shrink-0"
      />
      <span>{warning}</span>
    </aside>
  );
}
