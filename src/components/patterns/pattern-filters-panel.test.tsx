import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { PatternFiltersPanel } from "@/components/patterns/pattern-filters-panel";
import {
  defaultPatternFilters,
  type PatternFilters,
  type PatternSort,
} from "@/lib/pattern-filters";

function FiltersHarness() {
  const [filters, setFilters] = useState<PatternFilters>(defaultPatternFilters);
  const [sort, setSort] = useState<PatternSort>("name");
  const [isOpen, setOpen] = useState(false);

  return (
    <PatternFiltersPanel
      filters={filters}
      isOpen={isOpen}
      onClear={() => {
        setFilters(defaultPatternFilters);
        setSort("name");
      }}
      onFilterChange={(key, value) =>
        setFilters((current) => ({ ...current, [key]: value }))
      }
      onSortChange={setSort}
      onToggle={() => setOpen((open) => !open)}
      sort={sort}
    />
  );
}

describe("pattern filters panel", () => {
  it("labels every shadcn select and disables reset for default values", () => {
    render(<FiltersHarness />);

    for (const name of ["Genre", "Difficulty", "Meter", "Grid", "Sort"]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
    expect(
      screen.getByRole("button", { name: "Clear filters" }),
    ).toBeDisabled();
  });

  it("clears search without resetting another filter and restores input focus", async () => {
    const user = userEvent.setup();
    render(<FiltersHarness />);

    await user.click(screen.getByRole("combobox", { name: "Genre" }));
    await user.click(await screen.findByRole("option", { name: "Reggae" }));
    await user.type(
      screen.getByRole("searchbox", { name: "Search patterns" }),
      "one drop",
    );
    expect(screen.getByText("2 active")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
    expect(screen.getByRole("combobox", { name: "Genre" })).toHaveTextContent(
      "Reggae",
    );
    expect(screen.getByText("1 active")).toBeInTheDocument();
  });

  it("resets search, numeric filters, and sorting together", async () => {
    const user = userEvent.setup();
    render(<FiltersHarness />);

    await user.type(screen.getByRole("searchbox"), "rock");
    await user.click(screen.getByRole("combobox", { name: "Grid" }));
    await user.click(
      await screen.findByRole("option", { name: "Sixteenth notes" }),
    );
    await user.click(screen.getByRole("combobox", { name: "Sort" }));
    await user.click(
      await screen.findByRole("option", { name: "Default BPM" }),
    );
    expect(screen.getByRole("combobox", { name: "Grid" })).toHaveAttribute(
      "data-active",
    );

    await user.click(
      screen.getAllByRole("button", { name: "Clear filters" })[0],
    );
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Grid" })).toHaveTextContent(
      "All grids",
    );
    expect(screen.getByRole("combobox", { name: "Grid" })).not.toHaveAttribute(
      "data-active",
    );
    expect(screen.getByRole("combobox", { name: "Sort" })).toHaveTextContent(
      "Name",
    );
    expect(
      screen.getByRole("button", { name: "Clear filters" }),
    ).toBeDisabled();
  });

  it("exposes the mobile disclosure relationship", async () => {
    const user = userEvent.setup();
    render(<FiltersHarness />);

    const toggle = screen.getByRole("button", { name: "Show filters" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const controls = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    );
    expect(controls).toContainElement(
      screen.getByRole("combobox", { name: "Genre" }),
    );

    await user.click(toggle);
    expect(
      screen.getByRole("button", { name: "Hide filters" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
