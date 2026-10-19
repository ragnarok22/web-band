"use client";

import { FilterX, Search, SlidersHorizontal, X } from "lucide-react";
import { useId, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultPatternFilters,
  type PatternFilters,
  type PatternSort,
} from "@/lib/pattern-filters";
import type { PatternCategory, PatternDifficulty } from "@/types/pattern";

const categories: Array<PatternCategory | "all"> = [
  "all",
  "rock",
  "pop",
  "blues",
  "funk",
  "reggae",
  "country",
  "ballad",
  "latin",
  "metal",
  "jazz",
  "custom",
];

function formatOption(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

interface PatternFiltersPanelProps {
  filters: PatternFilters;
  isOpen: boolean;
  onClear: () => void;
  onFilterChange: <Key extends keyof PatternFilters>(
    key: Key,
    value: PatternFilters[Key],
  ) => void;
  onSortChange: (sort: PatternSort) => void;
  onToggle: () => void;
  sort: PatternSort;
}

export function PatternFiltersPanel({
  filters,
  isOpen,
  onClear,
  onFilterChange,
  onSortChange,
  onToggle,
  sort,
}: PatternFiltersPanelProps) {
  const id = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const activeFilterCount = (
    Object.keys(filters) as Array<keyof PatternFilters>
  ).filter((key) => filters[key] !== defaultPatternFilters[key]).length;
  const hasChanges = activeFilterCount > 0 || sort !== "name";

  return (
    <Card
      role="region"
      aria-label="Pattern filters"
      className="mb-6 gap-4 overflow-visible p-4 sm:p-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <InputGroup className="bg-surface-elevated dark:bg-surface-elevated h-11 flex-1">
          <InputGroupAddon className="pl-3">
            <Search aria-hidden="true" className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search patterns"
            className="h-11 [&::-webkit-search-cancel-button]:appearance-none"
            onChange={(event) => onFilterChange("search", event.target.value)}
            placeholder="Search patterns"
            ref={searchRef}
            type="search"
            value={filters.search}
          />
          {filters.search ? (
            <InputGroupAddon align="inline-end" className="pr-0">
              <InputGroupButton
                aria-label="Clear search"
                className="size-11"
                onClick={() => {
                  onFilterChange("search", "");
                  searchRef.current?.focus();
                }}
                size="icon-sm"
              >
                <X aria-hidden="true" className="size-4" />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>

        <Button
          aria-controls={`${id}-controls`}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Hide filters" : "Show filters"}
          className="data-active:border-primary/50 data-active:text-primary h-11 min-w-11 gap-2 px-3 sm:hidden"
          data-active={activeFilterCount > 0 || undefined}
          onClick={onToggle}
          type="button"
          variant="outline"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          {activeFilterCount > 0 ? (
            <Badge
              className="bg-primary/15 text-primary px-1.5"
              variant="secondary"
            >
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>

        <div className="hidden items-center gap-3 sm:flex">
          {activeFilterCount > 0 ? (
            <Badge className="bg-primary/10 text-primary" variant="secondary">
              {activeFilterCount} active
            </Badge>
          ) : null}
          <Button
            className="text-muted-strong h-11 gap-2 px-3 text-xs font-bold"
            disabled={!hasChanges}
            onClick={onClear}
            type="button"
            variant="ghost"
          >
            <FilterX aria-hidden="true" className="size-4" />
            Clear filters
          </Button>
        </div>
      </div>

      <div
        className={`${isOpen ? "grid" : "hidden"} grid-cols-2 gap-3 sm:grid lg:grid-cols-5`}
        id={`${id}-controls`}
      >
        <FilterSelect
          label="Genre"
          onChange={(value) =>
            onFilterChange("category", value as PatternCategory | "all")
          }
          options={categories.map((value) => ({
            label:
              value === "custom"
                ? "Utility"
                : value === "all"
                  ? "All genres"
                  : formatOption(value),
            value,
          }))}
          value={filters.category}
        />
        <FilterSelect
          label="Difficulty"
          onChange={(value) =>
            onFilterChange("difficulty", value as PatternDifficulty | "all")
          }
          options={["all", "beginner", "intermediate", "advanced"].map(
            (value) => ({
              label: value === "all" ? "All levels" : formatOption(value),
              value,
            }),
          )}
          value={filters.difficulty}
        />
        <FilterSelect
          label="Meter"
          onChange={(value) => onFilterChange("timeSignature", value)}
          options={[
            "all",
            "2/4",
            "3/4",
            "4/4",
            "5/4",
            "6/8",
            "7/8",
            "12/8",
          ].map((value) => ({
            label: value === "all" ? "All meters" : value,
            value,
          }))}
          value={filters.timeSignature}
        />
        <FilterSelect
          label="Grid"
          onChange={(value) =>
            onFilterChange(
              "subdivision",
              value === "all" ? "all" : value === "8" ? 8 : 16,
            )
          }
          options={[
            { label: "All grids", value: "all" },
            { label: "Eighth notes", value: "8" },
            { label: "Sixteenth notes", value: "16" },
          ]}
          value={String(filters.subdivision)}
        />
        <FilterSelect
          className="col-span-2 lg:col-span-1"
          defaultValue="name"
          label="Sort"
          onChange={(value) => onSortChange(value as PatternSort)}
          options={[
            { label: "Name", value: "name" },
            { label: "Default BPM", value: "bpm" },
            { label: "Recently used", value: "recent" },
            { label: "Favorites first", value: "favorites" },
          ]}
          value={sort}
        />
      </div>

      {hasChanges ? (
        <div className="border-border flex items-center justify-between gap-2 border-t pt-2 sm:hidden">
          <p className="text-muted-foreground text-xs">
            {activeFilterCount > 0
              ? `${activeFilterCount} active ${activeFilterCount === 1 ? "filter" : "filters"}`
              : "Custom sort order"}
          </p>
          <Button
            className="text-muted-strong h-11 gap-2 text-xs font-bold"
            onClick={onClear}
            type="button"
            variant="ghost"
          >
            <FilterX aria-hidden="true" className="size-4" />
            Clear filters
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

interface FilterSelectProps {
  className?: string;
  defaultValue?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}

function FilterSelect({
  className,
  defaultValue = "all",
  label,
  onChange,
  options,
  value,
}: FilterSelectProps) {
  const id = useId();

  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className ?? ""}`}>
      <Label
        className="text-muted-foreground text-[0.65rem] leading-4 font-bold tracking-[0.1em] uppercase"
        htmlFor={id}
      >
        {label}
      </Label>
      <Select
        items={options}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
        value={value}
      >
        <SelectTrigger
          className="data-active:border-primary/45 data-active:bg-primary/8 data-active:text-primary"
          data-active={value !== defaultValue || undefined}
          id={id}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
