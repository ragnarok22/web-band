"use client";

import dynamic from "next/dynamic";

import { SectionErrorBoundary } from "@/components/errors/section-error-boundary";
import { EditorSkeleton } from "@/components/editor/editor-skeleton";

const DrumPatternEditor = dynamic(
  () =>
    import("./drum-pattern-editor").then((module) => module.DrumPatternEditor),
  {
    loading: EditorSkeleton,
    ssr: false,
  },
);

export function EditorShell() {
  return (
    <SectionErrorBoundary section="Pattern workshop">
      <DrumPatternEditor />
    </SectionErrorBoundary>
  );
}
