import type { StrumAction } from "@/types/practice";

export const strumActionDetails: Record<
  StrumAction,
  { label: string; symbol: string }
> = {
  down: { label: "Down", symbol: "↓" },
  hold: { label: "Hold", symbol: "·" },
  mute: { label: "Mute", symbol: "×" },
  rest: { label: "Rest", symbol: "–" },
  up: { label: "Up", symbol: "↑" },
};
