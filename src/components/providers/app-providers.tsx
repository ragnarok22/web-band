"use client";

import { useEffect, type ReactNode } from "react";

import { storageService } from "@/db/storage-service";
import { usePracticeStore } from "@/stores/practice-store";
import { usePatternStore } from "@/stores/pattern-store";
import { useStorageStore } from "@/stores/storage-store";

import { ServiceWorkerUpdate } from "./service-worker-update";
import { StorageWarning } from "./storage-warning";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const hydrate = usePracticeStore((state) => state.hydrate);
  const hydratePatterns = usePatternStore((state) => state.hydrate);
  const setStorageStatus = useStorageStore((state) => state.setStorageStatus);

  useEffect(() => {
    hydrate();

    let isActive = true;
    void storageService.initialize().then((status) => {
      if (isActive) {
        setStorageStatus(status.mode, status.warning);
        void hydratePatterns();
      }
    });

    return () => {
      isActive = false;
    };
  }, [hydrate, hydratePatterns, setStorageStatus]);

  return (
    <>
      {children}
      <StorageWarning />
      <ServiceWorkerUpdate />
    </>
  );
}
