"use client";

import { AlertTriangle } from "lucide-react";

import { indexedDbCollections } from "@/db/repositories/repository-helpers";
import {
  corruptRowCollectionLabels,
  useStorageStore,
} from "@/stores/storage-store";

export function StorageWarning() {
  const warning = useStorageStore((state) => state.warning);
  const preferenceWriteFailures = useStorageStore(
    (state) => state.preferenceWriteFailures,
  );
  const corruptRowCounts = useStorageStore((state) => state.corruptRowCounts);
  const corruptCollections = indexedDbCollections.filter(
    (collection) => (corruptRowCounts[collection] ?? 0) > 0,
  );

  if (
    !warning &&
    preferenceWriteFailures.length === 0 &&
    corruptCollections.length === 0
  ) {
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
      <div className="space-y-2">
        {warning ? <p>{warning}</p> : null}
        {preferenceWriteFailures.length > 0 ? (
          <p>
            Some preferences could not be saved and may reset next visit:{" "}
            {preferenceWriteFailures.join(", ")}.
          </p>
        ) : null}
        {corruptCollections.length > 0 ? (
          <div>
            <p>
              Some saved data was partially recovered. Invalid rows skipped:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {corruptCollections.map((collection) => (
                <li key={collection}>
                  {corruptRowCollectionLabels[collection]}:{" "}
                  {corruptRowCounts[collection]}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
