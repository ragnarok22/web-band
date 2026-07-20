"use client";

import dynamic from "next/dynamic";

import { SectionErrorBoundary } from "@/components/errors/section-error-boundary";

const SettingsScreen = dynamic(
  () => import("./settings-screen").then((module) => module.SettingsScreen),
  {
    loading: () => (
      <main className="text-muted flex min-h-screen items-center justify-center text-sm font-bold tracking-wider uppercase">
        Opening settings
      </main>
    ),
    ssr: false,
  },
);

export function SettingsShell() {
  return (
    <SectionErrorBoundary section="Settings">
      <SettingsScreen />
    </SectionErrorBoundary>
  );
}
