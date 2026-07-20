export const pageEntry = { opacity: 0, y: 5 } as const;
export const panelEntry = { opacity: 0, y: 4 } as const;
export const stateEntry = { opacity: 0, scale: 0.94 } as const;
export const settled = { opacity: 1, scale: 1, y: 0 } as const;

export function motionTransition(reducedMotion: boolean, duration: number) {
  return {
    duration: reducedMotion ? 0 : duration,
    ease: "easeOut" as const,
  };
}
