import type { Metadata } from "next";

import { PatternBrowserShell } from "@/components/patterns/pattern-browser-shell";

export const metadata: Metadata = {
  title: "Patterns",
  description: "Browse original synthesized drum grooves for guitar practice.",
};

export default function PatternsPage() {
  return <PatternBrowserShell />;
}
