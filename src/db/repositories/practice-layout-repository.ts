export const PRACTICE_LAYOUT_KEY = "web-band-practice-layout-v1";

export function loadControlsOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(PRACTICE_LAYOUT_KEY) ?? "null",
    );
    return (
      typeof value === "object" &&
      value !== null &&
      "version" in value &&
      value.version === 1 &&
      "controlsOpen" in value &&
      value.controlsOpen === true
    );
  } catch {
    return false;
  }
}

export function saveControlsOpen(controlsOpen: boolean): boolean {
  try {
    window.localStorage.setItem(
      PRACTICE_LAYOUT_KEY,
      JSON.stringify({ version: 1, controlsOpen }),
    );
    return true;
  } catch {
    return false;
  }
}
