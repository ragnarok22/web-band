import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppMotionProvider } from "@/components/motion/app-motion-provider";
import { strumActionDetails } from "@/components/practice/strum-action-details";
import { StrummingSequence } from "@/components/practice/strumming-sequence";
import { basicPopPattern } from "@/data/strumming-patterns";
import { getBeatLabels, getStepsPerBar } from "@/lib/musical-time";
import {
  defaultAppearancePreferences,
  useAppearanceStore,
} from "@/stores/appearance-store";
import type { TimeSignature } from "@/types/pattern";
import type { StrummingPattern } from "@/types/practice";

const meters: TimeSignature[] = [
  { denominator: 4, numerator: 3 },
  { denominator: 4, numerator: 4 },
  { denominator: 8, numerator: 6 },
  { denominator: 8, numerator: 12 },
  { denominator: 4, numerator: 12 },
];

function createPattern(
  timeSignature: TimeSignature,
  subdivision: 8 | 16,
): StrummingPattern {
  return {
    ...basicPopPattern,
    steps: Array.from(
      { length: getStepsPerBar(timeSignature, subdivision) },
      (_, index) => ({
        accent: index % 3 === 0,
        action:
          basicPopPattern.steps[index % basicPopPattern.steps.length]!.action,
        id: `step-${index}`,
        subdivisionIndex: index,
      }),
    ),
    subdivision,
    timeSignature,
  };
}

function setScrollGeometry(
  viewport: HTMLElement,
  clientWidth = 200,
  scrollWidth = 640,
) {
  Object.defineProperties(viewport, {
    clientWidth: { configurable: true, value: clientWidth },
    scrollWidth: { configurable: true, value: scrollWidth },
  });
  viewport.scrollLeft = 100;
  viewport.scrollTop = 12;
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
  useAppearanceStore.setState(defaultAppearancePreferences);
});

describe("StrummingSequence", () => {
  for (const timeSignature of meters) {
    it.each([8, 16] as const)(
      `preserves ordered actions and beat grouping in ${timeSignature.numerator}/${timeSignature.denominator} with %i notes`,
      (subdivision) => {
        const pattern = createPattern(timeSignature, subdivision);
        const { container } = render(<StrummingSequence pattern={pattern} />);
        const list = screen.getByRole("list", {
          name: `${pattern.name} action sequence`,
        });
        const items = within(list).getAllByRole("listitem");
        const labels = getBeatLabels(pattern);
        const stepsPerBeat = subdivision / timeSignature.denominator;

        expect(items).toHaveLength(pattern.steps.length);
        expect(
          container.querySelectorAll('[data-beat-start="true"]'),
        ).toHaveLength(timeSignature.numerator);
        pattern.steps.forEach((step, index) => {
          const details = strumActionDetails[step.action];
          expect(items[index]).toHaveAccessibleName(
            `Step ${index + 1}, beat ${Math.floor(index / stepsPerBeat) + 1}, position ${labels[index]}: ${details.label}${step.accent ? ", accent" : ""}`,
          );
          expect(items[index]).toHaveAttribute("data-position", labels[index]);
          expect(items[index]).toHaveAttribute("data-action", step.action);
          expect(items[index]).toHaveAttribute(
            "data-accent",
            String(step.accent),
          );
          expect(within(items[index]!).getByText(details.symbol)).toBeVisible();
          if (step.accent) {
            expect(within(items[index]!).getByText(">")).toBeVisible();
          }
        });
        expect(container.querySelector("[aria-current]")).toBeNull();
        expect(container.querySelector("[aria-live]")).toBeNull();
        expect(screen.getAllByRole("list")).toHaveLength(1);
      },
    );
  }

  it("marks only the current action, not every accent, and clears a missing step", () => {
    const { container, rerender } = render(
      <StrummingSequence
        activeStepId={basicPopPattern.steps[4]!.id}
        pattern={basicPopPattern}
      />,
    );
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(container.querySelector('[aria-current="step"]')).toHaveAttribute(
      "data-action",
      "mute",
    );
    expect(
      screen.getByRole("listitem", { name: /Step 1,.*accent/ }),
    ).not.toHaveAttribute("aria-current");

    rerender(
      <StrummingSequence
        activeStepId="previous-pattern"
        pattern={basicPopPattern}
      />,
    );
    expect(container.querySelector("[aria-current]")).toBeNull();
  });

  it("shows the count-in beat on the same timeline without an active action", () => {
    const { container } = render(
      <StrummingSequence
        activeStepId={basicPopPattern.steps[0]!.id}
        countInBeat={3}
        pattern={basicPopPattern}
      />,
    );

    const countingSteps = container.querySelectorAll('[data-count-in="true"]');
    expect(countingSteps).toHaveLength(4);
    countingSteps.forEach((step) =>
      expect(step).toHaveAttribute("data-beat", "3"),
    );
    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(screen.getAllByRole("list")).toHaveLength(1);
  });

  it("provides a focusable local scrolling boundary and intensity settings", () => {
    const { rerender } = render(
      <StrummingSequence intensity="minimal" pattern={basicPopPattern} />,
    );
    const viewport = screen.getByRole("region", { name: "Strumming timeline" });
    expect(viewport).toHaveAttribute("tabindex", "0");
    expect(viewport).toHaveAttribute("data-intensity", "minimal");
    expect(viewport.className).toContain("timelineViewport");
    rerender(
      <StrummingSequence intensity="strong" pattern={basicPopPattern} />,
    );
    expect(viewport).toHaveAttribute("data-intensity", "strong");
    rerender(<StrummingSequence pattern={basicPopPattern} />);
    expect(viewport).toHaveAttribute("data-intensity", "standard");
  });

  it.each([
    { key: "ArrowLeft", scrollLeft: 60 },
    { key: "ArrowRight", scrollLeft: 140 },
  ])(
    "scrolls $key locally by 40px without invoking shortcuts or native scrolling",
    ({ key, scrollLeft }) => {
      render(<StrummingSequence pattern={basicPopPattern} />);
      const viewport = screen.getByRole("region", {
        name: "Strumming timeline",
      });
      setScrollGeometry(viewport);
      const shortcut = vi.fn();
      window.addEventListener("keydown", shortcut);
      try {
        viewport.focus();
        const event = new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key,
        });
        expect(fireEvent(viewport, event)).toBe(false);
        expect(event.defaultPrevented).toBe(true);
        expect(shortcut).not.toHaveBeenCalled();
        expect(viewport.scrollLeft).toBe(scrollLeft);
        expect(viewport.scrollTop).toBe(12);
        expect(viewport).toHaveFocus();
      } finally {
        window.removeEventListener("keydown", shortcut);
      }
    },
  );

  it("bounds horizontal keyboard scrolling at either edge", () => {
    render(<StrummingSequence pattern={basicPopPattern} />);
    const viewport = screen.getByRole("region", { name: "Strumming timeline" });
    setScrollGeometry(viewport);
    viewport.scrollLeft = 20;
    fireEvent.keyDown(viewport, { key: "ArrowLeft" });
    expect(viewport.scrollLeft).toBe(0);
    fireEvent.keyDown(viewport, { key: "ArrowLeft", repeat: true });
    expect(viewport.scrollLeft).toBe(0);
    viewport.scrollLeft = 420;
    fireEvent.keyDown(viewport, { key: "ArrowRight" });
    expect(viewport.scrollLeft).toBe(440);
    fireEvent.keyDown(viewport, { key: "ArrowRight", repeat: true });
    expect(viewport.scrollLeft).toBe(440);
  });

  it("keeps a nonoverflowing timeline at zero for both horizontal keys", () => {
    render(<StrummingSequence pattern={basicPopPattern} />);
    const viewport = screen.getByRole("region", { name: "Strumming timeline" });
    setScrollGeometry(viewport, 640, 640);
    viewport.scrollLeft = 0;
    for (const key of ["ArrowLeft", "ArrowRight"]) {
      expect(fireEvent.keyDown(viewport, { key })).toBe(false);
      expect(viewport.scrollLeft).toBe(0);
    }
  });

  it.each(["altKey", "ctrlKey", "metaKey"] as const)(
    "preserves browser horizontal shortcuts with %s",
    (modifier) => {
      render(<StrummingSequence pattern={basicPopPattern} />);
      const viewport = screen.getByRole("region", {
        name: "Strumming timeline",
      });
      setScrollGeometry(viewport);
      const shortcut = vi.fn();
      window.addEventListener("keydown", shortcut);
      try {
        for (const key of ["ArrowLeft", "ArrowRight"]) {
          const event = new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key,
            [modifier]: true,
          });
          expect(fireEvent(viewport, event)).toBe(true);
          expect(event.defaultPrevented).toBe(false);
          expect(viewport.scrollLeft).toBe(100);
        }
        expect(shortcut).toHaveBeenCalledTimes(2);
      } finally {
        window.removeEventListener("keydown", shortcut);
      }
    },
  );

  it("does not intercept unrelated practice shortcut keys", () => {
    render(<StrummingSequence pattern={basicPopPattern} />);
    const viewport = screen.getByRole("region", { name: "Strumming timeline" });
    setScrollGeometry(viewport);
    const shortcut = vi.fn();
    window.addEventListener("keydown", shortcut);
    try {
      for (const key of [
        "ArrowUp",
        "ArrowDown",
        " ",
        "Escape",
        "f",
        "Home",
        "End",
        "Tab",
      ]) {
        expect(fireEvent.keyDown(viewport, { key })).toBe(true);
        expect(viewport.scrollLeft).toBe(100);
        expect(viewport.scrollTop).toBe(12);
      }
      expect(shortcut).toHaveBeenCalledTimes(8);
    } finally {
      window.removeEventListener("keydown", shortcut);
    }
  });

  it("reveals only offscreen active steps by scrolling the local viewport, without moving focus", () => {
    const { rerender } = render(
      <>
        <button>Keep focus</button>
        <StrummingSequence pattern={basicPopPattern} />
      </>,
    );
    const viewport = screen.getByRole("region", { name: "Strumming timeline" });
    const items = screen.getAllByRole("listitem");
    let scrollLeft = 100;
    const setScrollLeft = vi.fn((value: number) => {
      scrollLeft = value;
    });
    Object.defineProperties(viewport, {
      clientLeft: { configurable: true, value: 1 },
      clientWidth: { configurable: true, value: 200 },
      scrollLeft: {
        configurable: true,
        get: () => scrollLeft,
        set: setScrollLeft,
      },
      scrollWidth: { configurable: true, value: 640 },
    });
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(
      new DOMRect(20, 30, 202, 80),
    );
    items.forEach((item, index) => {
      vi.spyOn(item, "getBoundingClientRect").mockImplementation(
        () => new DOMRect(21 + index * 40 - scrollLeft, 30, 40, 75),
      );
    });
    viewport.scrollTop = 12;
    const focus = screen.getByRole("button", { name: "Keep focus" });
    focus.focus();
    const pageScroll = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => {});
    const showStep = (index: number | null) =>
      rerender(
        <>
          <button>Keep focus</button>
          <StrummingSequence
            activeStepId={
              index === null ? null : basicPopPattern.steps[index]!.id
            }
            pattern={basicPopPattern}
          />
        </>,
      );

    try {
      showStep(8);
      expect(setScrollLeft).toHaveBeenLastCalledWith(160);
      expect(viewport.scrollLeft).toBe(160);
      setScrollLeft.mockClear();
      showStep(5);
      expect(setScrollLeft).not.toHaveBeenCalled();
      expect(viewport.scrollLeft).toBe(160);
      showStep(null);
      expect(setScrollLeft).not.toHaveBeenCalled();
      expect(viewport.scrollLeft).toBe(160);
      showStep(0);
      expect(setScrollLeft).toHaveBeenLastCalledWith(0);
      expect(viewport.scrollLeft).toBe(0);
      expect(viewport.scrollTop).toBe(12);
      expect(pageScroll).not.toHaveBeenCalled();
      expect(focus).toHaveFocus();
      expect(viewport).toHaveAttribute("data-motion-reduced", "true");
    } finally {
      pageScroll.mockRestore();
    }
  });

  it.each([
    { appReduced: false, expected: "false", systemReduced: false },
    { appReduced: true, expected: "true", systemReduced: false },
    { appReduced: false, expected: "true", systemReduced: true },
  ])(
    "respects app and system reduced motion: %j",
    ({ appReduced, expected, systemReduced }) => {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: vi.fn().mockReturnValue({
          addEventListener: vi.fn(),
          matches: systemReduced,
          removeEventListener: vi.fn(),
        }),
      });
      useAppearanceStore.setState({
        hasHydrated: true,
        reducedMotion: appReduced,
      });
      render(
        <AppMotionProvider>
          <StrummingSequence pattern={basicPopPattern} />
        </AppMotionProvider>,
      );
      expect(
        screen.getByRole("region", { name: "Strumming timeline" }),
      ).toHaveAttribute("data-motion-reduced", expected);
    },
  );
});
