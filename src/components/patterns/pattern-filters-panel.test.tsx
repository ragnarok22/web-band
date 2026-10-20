import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { PatternFiltersPanel } from "@/components/patterns/pattern-filters-panel";
import {
  defaultPatternFilters,
  defaultPatternSort,
  type PatternFilters,
  type PatternSort,
} from "@/lib/pattern-filters";

function FiltersHarness() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<PatternFilters>(defaultPatternFilters);
  const [sort, setSort] = useState<PatternSort>(defaultPatternSort);
  const [isOpen, setOpen] = useState(false);

  return (
    <PatternFiltersPanel
      filters={filters}
      isOpen={isOpen}
      onClear={() => {
        setFilters(defaultPatternFilters);
        setSort(defaultPatternSort);
      }}
      onFilterChange={(key, value) =>
        setFilters((current) => ({ ...current, [key]: value }))
      }
      onSortChange={setSort}
      onToggle={() => setOpen((open) => !open)}
      sort={sort}
      searchInputRef={searchInputRef}
    />
  );
}

describe("pattern filters panel", () => {
  it("discloses labeled advanced filters on every screen size", async () => {
    const user = userEvent.setup();
    render(<FiltersHarness />);

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset filters" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show filters" }));
    for (const name of [
      "Genre",
      "Time signature",
      "Subdivision / grid",
      "Sort order",
    ]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
  });

  it("clears search without resetting another filter and restores input focus", async () => {
    const user = userEvent.setup();
    render(<FiltersHarness />);

    await user.click(screen.getByRole("button", { name: "Show filters" }));
    await user.click(screen.getByRole("combobox", { name: "Genre" }));
    await user.click(await screen.findByRole("option", { name: "Reggae" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search patterns" }),
      "one drop",
    );
    expect(screen.getByText("Active filters:").parentElement).toHaveTextContent(
      "1",
    );

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    expect(screen.getByRole("combobox", { name: "Genre" })).toHaveTextContent(
      "Reggae",
    );
    expect(screen.getByText("Active filters:").parentElement).toHaveTextContent(
      "1",
    );
  });

  it("resets search, numeric filters, and sorting together", async () => {
    const user = userEvent.setup();
    render(<FiltersHarness />);

    await user.click(screen.getByRole("button", { name: "Show filters" }));
    await user.type(screen.getByRole("searchbox"), "rock");
    await user.click(screen.getByRole("button", { name: "Beginner" }));
    await user.click(
      screen.getByRole("combobox", { name: "Subdivision / grid" }),
    );
    await user.click(
      await screen.findByRole("option", { name: "Sixteenth notes" }),
    );
    await user.click(screen.getByRole("combobox", { name: "Sort order" }));
    await user.click(
      await screen.findByRole("option", { name: "Default BPM" }),
    );
    expect(
      screen.getByRole("combobox", { name: "Subdivision / grid" }),
    ).toHaveAttribute("data-active");

    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(
      screen.getByRole("combobox", { name: "Subdivision / grid" }),
    ).toHaveTextContent("All grids");
    expect(
      screen.getByRole("combobox", { name: "Subdivision / grid" }),
    ).not.toHaveAttribute("data-active");
    expect(
      screen.getByRole("combobox", { name: "Sort order" }),
    ).toHaveTextContent("Recommended");
    expect(screen.queryByRole("button", { name: "Reset filters" })).toBeNull();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("exposes the disclosure relationship and removes collapsed controls from keyboard navigation", async () => {
    const user = userEvent.setup();
    render(<FiltersHarness />);

    const toggle = screen.getByRole("button", { name: "Show filters" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const controls = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    );
    expect(controls).toHaveAttribute("hidden");

    await user.click(toggle);
    expect(
      screen.getByRole("button", { name: "Hide filters" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(controls).toContainElement(
      screen.getByRole("combobox", { name: "Genre" }),
    );
    await user.click(screen.getByRole("button", { name: "Hide filters" }));
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
