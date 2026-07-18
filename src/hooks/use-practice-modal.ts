"use client";

import { useEffect } from "react";

import { usePracticeUiStore } from "@/stores/practice-ui-store";

export function usePracticeModal(open: boolean): void {
  const closeModal = usePracticeUiStore((state) => state.closeModal);
  const openModal = usePracticeUiStore((state) => state.openModal);

  useEffect(() => {
    if (!open) return;
    openModal();
    return closeModal;
  }, [closeModal, open, openModal]);
}
