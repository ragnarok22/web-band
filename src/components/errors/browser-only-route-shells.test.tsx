import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rendering = vi.hoisted(() => ({ loading: false }));
const dynamic = vi.hoisted(() =>
  vi.fn(
    (
      loader: unknown,
      options: { ssr: boolean; loading: () => React.ReactNode },
    ) => {
      void loader;
      return function BrokenScreen() {
        if (rendering.loading) return options.loading();
        throw new Error("Dynamic screen failed");
      };
    },
  ),
);

vi.mock("next/dynamic", () => ({ default: dynamic }));

import { EditorShell } from "@/components/editor/editor-shell";
import { HistoryShell } from "@/components/history/history-shell";
import { PatternBrowserShell } from "@/components/patterns/pattern-browser-shell";
import { PracticeShell } from "@/components/practice/practice-shell";
import { SettingsShell } from "@/components/settings/settings-shell";

const shells = [
  ["Pattern workshop hit a snag", EditorShell],
  ["Practice journal hit a snag", HistoryShell],
  ["Groove library hit a snag", PatternBrowserShell],
  ["Practice room hit a snag", PracticeShell],
  ["Settings hit a snag", SettingsShell],
] as const;

describe("browser-only route shells", () => {
  beforeEach(() => {
    rendering.loading = false;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("keeps every dynamic screen client-only", async () => {
    // Replay module initialization after Vitest clears mock call history.
    vi.resetModules();
    await Promise.all([
      import("@/components/editor/editor-shell"),
      import("@/components/history/history-shell"),
      import("@/components/patterns/pattern-browser-shell"),
      import("@/components/practice/practice-shell"),
      import("@/components/settings/settings-shell"),
    ]);

    expect(dynamic).toHaveBeenCalledTimes(5);
    for (const [, options] of dynamic.mock.calls) {
      expect(options).toEqual(expect.objectContaining({ ssr: false }));
    }
  });

  it.each(shells)("isolates %s", (heading, Shell) => {
    render(<Shell />);

    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  it.each(shells)(
    "renders a page skeleton while %s is loading",
    (_heading, Shell) => {
      rendering.loading = true;
      const { container } = render(<Shell />);

      expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
    },
  );
});
