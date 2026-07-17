"use client";

import dynamic from "next/dynamic";

const PatternBrowser = dynamic(
  () => import("./pattern-browser").then((module) => module.PatternBrowser),
  {
    loading: () => (
      <main className="text-muted flex min-h-screen items-center justify-center text-sm font-bold tracking-wider uppercase">
        Opening the groove library
      </main>
    ),
    ssr: false,
  },
);

export function PatternBrowserShell() {
  return <PatternBrowser />;
}
