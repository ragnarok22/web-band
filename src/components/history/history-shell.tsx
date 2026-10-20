"use client";

import dynamic from "next/dynamic";

import { SectionErrorBoundary } from "@/components/errors/section-error-boundary";
import { HistorySkeleton } from "@/components/history/history-skeleton";

const HistoryScreen = dynamic(
  () => import("./history-screen").then((module) => module.HistoryScreen),
  {
    loading: HistorySkeleton,
    ssr: false,
  },
);

export function HistoryShell() {
  return (
    <SectionErrorBoundary section="Practice journal">
      <HistoryScreen />
    </SectionErrorBoundary>
  );
}
