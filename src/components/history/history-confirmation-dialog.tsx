"use client";

import { ConfirmationDialog } from "@/components/editor/confirmation-dialog";

export function HistoryConfirmationDialog(
  props: Omit<Parameters<typeof ConfirmationDialog>[0], "destructive">,
) {
  return <ConfirmationDialog {...props} destructive />;
}
