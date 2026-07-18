import type { Metadata } from "next";

import { EditorShell } from "@/components/editor/editor-shell";

export const metadata: Metadata = {
  title: "Pattern Editor",
  description: "Create and edit a custom drum groove for practice.",
};

export default function EditorPage() {
  return <EditorShell />;
}
