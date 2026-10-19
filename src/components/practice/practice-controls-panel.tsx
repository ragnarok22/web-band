"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDesktopLayout } from "@/hooks/use-desktop-layout";
import { usePracticeModal } from "@/hooks/use-practice-modal";
import { usePracticeUiStore } from "@/stores/practice-ui-store";

export function usePracticeControlsPanel() {
  const desktop = useDesktopLayout();
  const desktopOpen = usePracticeUiStore((state) => state.controlsOpen);
  const setDesktopOpen = usePracticeUiStore((state) => state.setControlsOpen);
  const hydrate = usePracticeUiStore((state) => state.hydrateLayout);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  useEffect(() => {
    const media = window.matchMedia?.("(min-width: 1024px)");
    const dismissMobileSheet = () => setMobileOpen(false);
    media?.addEventListener("change", dismissMobileSheet);
    return () => media?.removeEventListener("change", dismissMobileSheet);
  }, []);
  usePracticeModal(!desktop && mobileOpen);
  return {
    desktop,
    open: desktop ? desktopOpen : mobileOpen,
    setOpen: desktop ? setDesktopOpen : setMobileOpen,
  };
}

type PanelState = ReturnType<typeof usePracticeControlsPanel>;

export function PracticeControlsTrigger({ panel }: { panel: PanelState }) {
  return (
    <Button
      id="practice-controls-trigger"
      aria-controls={
        panel.desktop || panel.open ? "practice-controls" : undefined
      }
      aria-expanded={panel.open}
      variant="outline"
      className="min-h-11 gap-2 px-3"
      onClick={() => panel.setOpen(!panel.open)}
    >
      <SlidersHorizontal aria-hidden="true" className="size-4" />
      Controls
    </Button>
  );
}

export function PracticeControlsPanel({
  children,
  panel,
}: {
  children: ReactNode;
  panel: PanelState;
}) {
  if (panel.desktop) {
    return (
      <div
        className={`relative min-w-0 overflow-hidden ${panel.open ? "" : "max-h-0"}`}
        inert={!panel.open}
        aria-hidden={!panel.open}
      >
        <aside
          aria-label="Practice controls"
          id="practice-controls"
          className="border-border bg-surface w-[21rem] rounded-2xl border"
        >
          <div className="border-border flex min-h-14 items-center justify-between border-b px-4">
            <h2 className="text-sm font-extrabold">Controls</h2>
            <Button
              variant="ghost"
              className="min-h-11 px-3"
              onClick={() => {
                panel.setOpen(false);
                document.getElementById("practice-controls-trigger")?.focus();
              }}
            >
              Hide controls
            </Button>
          </div>
          {children}
        </aside>
      </div>
    );
  }
  return (
    <Sheet open={panel.open} onOpenChange={panel.setOpen}>
      <SheetContent
        id="practice-controls"
        finalFocus={() => document.getElementById("practice-controls-trigger")}
      >
        <SheetHeader className="border-border border-b pr-16">
          <SheetTitle>Practice controls</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
