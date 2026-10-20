"use client";

import dynamic from "next/dynamic";

import { SectionErrorBoundary } from "@/components/errors/section-error-boundary";
import { PracticeSkeleton } from "@/components/practice/practice-skeleton";

const PracticeScreen = dynamic(
  () => import("./practice-screen").then((module) => module.PracticeScreen),
  {
    loading: PracticeSkeleton,
    ssr: false,
  },
);

export function PracticeShell() {
  return (
    <SectionErrorBoundary section="Practice room">
      <PracticeScreen />
    </SectionErrorBoundary>
  );
}
