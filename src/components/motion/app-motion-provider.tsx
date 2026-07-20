"use client";

import { domAnimation, LazyMotion, MotionConfig } from "framer-motion";
import {
  createContext,
  type ReactNode,
  useContext,
  useSyncExternalStore,
} from "react";

import { useAppearanceStore } from "@/stores/appearance-store";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const AppReducedMotionContext = createContext(true);

function getReducedMotionMedia(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia(reducedMotionQuery);
}

function subscribeToReducedMotion(onChange: () => void): () => void {
  const media = getReducedMotionMedia();
  media?.addEventListener("change", onChange);
  return () => media?.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot(): boolean {
  return getReducedMotionMedia()?.matches ?? false;
}

export function AppMotionProvider({ children }: { children: ReactNode }) {
  const hasHydrated = useAppearanceStore((state) => state.hasHydrated);
  const reducedMotion = useAppearanceStore((state) => state.reducedMotion);
  const systemReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => true,
  );
  const shouldReduceMotion =
    !hasHydrated || reducedMotion || systemReducedMotion;

  return (
    <AppReducedMotionContext value={shouldReduceMotion}>
      <LazyMotion features={domAnimation} strict>
        <MotionConfig
          reducedMotion={
            hasHydrated && (reducedMotion || systemReducedMotion)
              ? "always"
              : "never"
          }
          transition={shouldReduceMotion ? { duration: 0 } : undefined}
        >
          {children}
        </MotionConfig>
      </LazyMotion>
    </AppReducedMotionContext>
  );
}

export function useAppReducedMotion(): boolean {
  return useContext(AppReducedMotionContext);
}
