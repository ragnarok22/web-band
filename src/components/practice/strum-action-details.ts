import type { StrumAction } from "@/types/practice";

export const strumActionDetails: Record<
  StrumAction,
  { guidance: string; label: string; symbol: string }
> = {
  down: {
    guidance: "Strum downward.",
    label: "Down",
    symbol: "↓",
  },
  hold: {
    guidance: "Let strings ring. No new strum.",
    label: "Hold",
    symbol: "·",
  },
  mute: {
    guidance: "Mute the strings.",
    label: "Mute",
    symbol: "×",
  },
  rest: {
    guidance: "Do not strum here.",
    label: "Rest",
    symbol: "–",
  },
  up: {
    guidance: "Strum upward.",
    label: "Up",
    symbol: "↑",
  },
};
