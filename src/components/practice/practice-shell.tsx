"use client";

import dynamic from "next/dynamic";

const PracticeScreen = dynamic(
  () => import("./practice-screen").then((module) => module.PracticeScreen),
  {
    loading: () => (
      <main className="text-muted flex min-h-screen items-center justify-center text-sm font-bold tracking-wider uppercase">
        Preparing the practice room
      </main>
    ),
    ssr: false,
  },
);

export function PracticeShell() {
  return <PracticeScreen />;
}
