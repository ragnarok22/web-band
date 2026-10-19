"use client";

import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";

export function HistoryConfirmationDialog(
  props: Omit<Parameters<typeof ConfirmationDialog>[0], "destructive">,
) {
  return <ConfirmationDialog {...props} destructive />;
}
