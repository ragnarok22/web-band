"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function ServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const hadController = Boolean(navigator.serviceWorker.controller);
    const handleControllerChange = () => {
      if (hadController) {
        setUpdateAvailable(true);
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );
    return () =>
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
  }, []);

  if (!updateAvailable) {
    return null;
  }

  return (
    <aside
      className="border-border-strong bg-surface-elevated fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border p-4 shadow-2xl"
      role="status"
    >
      <p className="text-muted-strong text-sm">A new version is ready.</p>
      <button
        className="bg-accent text-accent-ink hover:bg-accent-strong flex min-h-11 items-center gap-2 rounded-lg px-3 font-bold transition-colors"
        onClick={() => window.location.reload()}
        type="button"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        Reload
      </button>
    </aside>
  );
}
