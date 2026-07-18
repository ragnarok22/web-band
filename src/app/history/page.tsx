import type { Metadata } from "next";

import { HistoryShell } from "@/components/history/history-shell";

export const metadata: Metadata = {
  title: "Practice History",
  description: "Review practice sessions saved locally on this device.",
};

export default function HistoryPage() {
  return <HistoryShell />;
}
