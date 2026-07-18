"use client";

import dynamic from "next/dynamic";

const DrumPatternEditor = dynamic(
  () =>
    import("./drum-pattern-editor").then((module) => module.DrumPatternEditor),
  {
    loading: () => (
      <main className="text-muted flex min-h-screen items-center justify-center text-sm font-extrabold tracking-wider uppercase">
        Opening the pattern workshop
      </main>
    ),
    ssr: false,
  },
);

export function EditorShell() {
  return <DrumPatternEditor />;
}
