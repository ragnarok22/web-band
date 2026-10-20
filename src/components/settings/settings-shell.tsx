"use client";

import dynamic from "next/dynamic";

import { SectionErrorBoundary } from "@/components/errors/section-error-boundary";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";

const SettingsScreen = dynamic(
  () => import("./settings-screen").then((module) => module.SettingsScreen),
  {
    loading: SettingsSkeleton,
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
