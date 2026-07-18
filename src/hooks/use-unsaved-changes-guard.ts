"use client";

import { useEffect } from "react";

const confirmationMessage =
  "You have unsaved pattern changes. Leave the editor and discard them?";

function isPlainSameOriginLink(event: MouseEvent): HTMLAnchorElement | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return null;
  }
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const link = target.closest("a[href]");
  if (
    !(link instanceof HTMLAnchorElement) ||
    link.download ||
    (link.target && link.target !== "_self")
  ) {
    return null;
  }
  return new URL(link.href, window.location.href).origin ===
    window.location.origin
    ? link
    : null;
}

export function useUnsavedChangesGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    function guardUnload(event: BeforeUnloadEvent): void {
      event.preventDefault();
      event.returnValue = true;
    }

    function guardLink(event: MouseEvent): void {
      if (
        !isPlainSameOriginLink(event) ||
        window.confirm(confirmationMessage)
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function guardHistory(): void {
      if (!window.confirm(confirmationMessage)) window.history.forward();
    }

    window.addEventListener("beforeunload", guardUnload);
    window.addEventListener("click", guardLink, true);
    window.addEventListener("popstate", guardHistory);
    return () => {
      window.removeEventListener("beforeunload", guardUnload);
      window.removeEventListener("click", guardLink, true);
      window.removeEventListener("popstate", guardHistory);
    };
  }, [isDirty]);
}
