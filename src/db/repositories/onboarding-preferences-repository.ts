export const ONBOARDING_STORAGE_KEY = "web-band-onboarding-dismissed";

export function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "true";
  } catch {
    return true;
  }
}

export function saveOnboardingDismissal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    return true;
  } catch {
    return false;
  }
}

export function clearOnboardingDismissal(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
