import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AppMotionProvider,
  useAppReducedMotion,
} from "@/components/motion/app-motion-provider";
import {
  defaultAppearancePreferences,
  useAppearanceStore,
} from "@/stores/appearance-store";

function installReducedMotionPreference(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((media: string) => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: media === "(prefers-reduced-motion: reduce)" && matches,
      media,
      onchange: null,
      removeEventListener: vi.fn(),
    })),
  });
}

function MotionPolicy() {
  const reducedMotion = useAppReducedMotion();
  return <p>{reducedMotion ? "Motion reduced" : "Motion enabled"}</p>;
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("app motion provider", () => {
  it("disables motion until appearance preferences hydrate", () => {
    installReducedMotionPreference(false);
    useAppearanceStore.setState({
      ...defaultAppearancePreferences,
      hasHydrated: false,
    });

    render(
      <AppMotionProvider>
        <MotionPolicy />
      </AppMotionProvider>,
    );

    expect(screen.getByText("Motion reduced")).toBeVisible();
  });

  it.each([
    { appReduced: true, expected: "Motion reduced", systemReduced: false },
    { appReduced: false, expected: "Motion reduced", systemReduced: true },
    { appReduced: false, expected: "Motion enabled", systemReduced: false },
  ])(
    "combines app=$appReduced and system=$systemReduced preferences",
    ({ appReduced, expected, systemReduced }) => {
      installReducedMotionPreference(systemReduced);
      useAppearanceStore.setState({
        ...defaultAppearancePreferences,
        hasHydrated: true,
        reducedMotion: appReduced,
      });

      render(
        <AppMotionProvider>
          <MotionPolicy />
        </AppMotionProvider>,
      );

      expect(screen.getByText(expected)).toBeVisible();
    },
  );
});
