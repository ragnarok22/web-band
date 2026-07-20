import type { WakeLockStatus } from "@/hooks/use-wake-lock";

interface WakeLockStatusMessageProps {
  id?: string;
  status: WakeLockStatus;
}

export function WakeLockStatusMessage({
  id = "wake-lock-status",
  status,
}: WakeLockStatusMessageProps) {
  const message =
    status === "unsupported"
      ? "This browser cannot keep the screen awake. Practice will continue, but the screen may sleep."
      : status === "error"
        ? "The screen could not be kept awake. Practice will continue, but the screen may sleep."
        : null;

  if (!message) return null;
  return (
    <p
      className="border-border bg-surface-elevated text-muted-strong col-span-full rounded-lg border px-3 py-2 text-xs leading-5"
      id={id}
      role="status"
    >
      {message}
    </p>
  );
}
