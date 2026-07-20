import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dynamic = vi.hoisted(() =>
  vi.fn((loader: unknown, options: { ssr: boolean }) => {
    void loader;
    void options;
    return function BrokenScreen() {
      throw new Error("Dynamic screen failed");
    };
  }),
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
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("keeps every dynamic screen client-only", () => {
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
});
