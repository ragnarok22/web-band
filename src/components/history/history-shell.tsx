"use client";

import dynamic from "next/dynamic";

const HistoryScreen = dynamic(
  () => import("./history-screen").then((module) => module.HistoryScreen),
  {
    loading: () => (
      <main className="text-muted flex min-h-screen items-center justify-center text-sm font-bold tracking-wider uppercase">
        Opening your practice journal
      </main>
    ),
    ssr: false,
  },
);

export function HistoryShell() {
  return <HistoryScreen />;
}
