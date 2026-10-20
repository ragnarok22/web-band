"use client";

import dynamic from "next/dynamic";

import { SectionErrorBoundary } from "@/components/errors/section-error-boundary";
import { PatternBrowserSkeleton } from "@/components/patterns/pattern-browser-skeleton";

const PatternBrowser = dynamic(
  () => import("./pattern-browser").then((module) => module.PatternBrowser),
  {
    loading: PatternBrowserSkeleton,
    ssr: false,
  },
);

export function PatternBrowserShell() {
  return (
    <SectionErrorBoundary section="Groove library">
      <PatternBrowser />
    </SectionErrorBoundary>
  );
}
