import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditorSkeleton } from "@/components/editor/editor-skeleton";
import { HistorySkeleton } from "@/components/history/history-skeleton";
import { PatternBrowserSkeleton } from "@/components/patterns/pattern-browser-skeleton";
import { PracticePresetSkeleton } from "@/components/practice/practice-preset-skeleton";
import { PracticeSkeleton } from "@/components/practice/practice-skeleton";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const screens = [
  ["Setting up the pattern workshop", EditorSkeleton],
  ["Opening your practice journal", HistorySkeleton],
  ["Loading your groove library", PatternBrowserSkeleton],
  ["Loading your saved practice setup…", PracticeSkeleton],
  ["Opening settings", SettingsSkeleton],
] as const;

describe("loading skeletons", () => {
  it.each(screens)(
    "gives %s one announcement and decorative placeholders",
    (label, Screen) => {
      const { container } = render(<Screen />);

      const status = screen.getByRole("status");
      const main = screen.getByRole("main", { name: label });
      expect(status).toHaveTextContent(label);
      expect(status).toHaveClass("sr-only");
      expect(main).toHaveAttribute("aria-busy", "true");
      expect(main).not.toContainElement(status);
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.queryByRole("heading")).toBeNull();
      expect(screen.queryByRole("link")).toBeNull();

      const placeholders = container.querySelectorAll('[data-slot="skeleton"]');
      expect(placeholders.length).toBeGreaterThan(10);
      for (const placeholder of placeholders) {
        expect(placeholder).toHaveAttribute("aria-hidden", "true");
        expect(placeholder).not.toHaveAttribute("tabindex");
      }
    },
  );

  it("supports inline loading without nesting a main landmark", () => {
    const { container } = render(<PracticePresetSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading presets…");
    expect(
      screen.getByRole("region", { name: "Loading presets…" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("main")).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("allows custom placeholder dimensions while keeping it decorative", () => {
    const { container } = render(
      <LoadingSkeleton as="div" label="Opening content" className="w-full">
        <Skeleton className="h-8 w-24 rounded-full" style={{ maxWidth: 96 }} />
      </LoadingSkeleton>,
    );
    const placeholder = container.querySelector('[data-slot="skeleton"]');

    expect(placeholder).toHaveClass("skeleton", "h-8", "w-24", "rounded-full");
    expect(placeholder).toHaveStyle({ maxWidth: "96px" });
    expect(placeholder?.parentElement).toHaveAttribute("aria-hidden", "true");
  });
});
