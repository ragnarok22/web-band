"use client";

import { useSyncExternalStore } from "react";

const query = "(min-width: 1024px)";

function subscribe(listener: () => void): () => void {
  const media = window.matchMedia?.(query);
  media?.addEventListener("change", listener);
  return () => media?.removeEventListener("change", listener);
}

function getSnapshot(): boolean {
  return window.matchMedia?.(query).matches ?? true;
}

export function useDesktopLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
