"use client";

import { ChevronDown, Heart, Search, SlidersHorizontal, X } from "lucide-react";
import { useId, type RefObject } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  defaultPatternSort,
  type PatternFilters,
  type PatternQuickFilter,
  type PatternSort,
} from "@/lib/pattern-filters";
import type { PatternCategory } from "@/types/pattern";

const quickFilters: Array<{ label: string; value: PatternQuickFilter }> = [
  { label: "All", value: "all" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
  { label: "Favorites", value: "favorites" },
  { label: "My Patterns", value: "custom" },
];

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
  searchInputRef: RefObject<HTMLInputElement | null>;
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
  searchInputRef,
  filters,
  isOpen,
  onClear,
  onFilterChange,
  onSortChange,
  onToggle,
  sort,
}: PatternFiltersPanelProps) {
  const id = useId();
  const hasChanges =
    (Object.keys(filters) as Array<keyof PatternFilters>).some(
      (key) => filters[key] !== defaultPatternFilters[key],
    ) || sort !== defaultPatternSort;
  const activeFilterCount = [
    filters.category !== "all",
    filters.timeSignature !== "all",
    filters.subdivision !== "all",
    sort !== defaultPatternSort,
  ].filter(Boolean).length;

  return (
    <section
      aria-label="Pattern filters"
      className="border-border mb-5 border-b pb-4"
    >
      <div className="min-w-0">
        <InputGroup className="bg-surface-elevated dark:bg-surface-elevated h-12">
          <InputGroupAddon className="pl-3">
            <Search aria-hidden="true" className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search patterns"
            className="h-12 text-base [&::-webkit-search-cancel-button]:appearance-none"
            onChange={(event) => onFilterChange("search", event.target.value)}
            placeholder="Search grooves by name or style..."
            ref={searchInputRef}
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
                  searchInputRef.current?.focus();
                }}
                size="icon-sm"
              >
                <X aria-hidden="true" className="size-4" />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div
          aria-label="Quick filters"
          className="flex flex-wrap gap-1"
          role="group"
        >
          {quickFilters.map(({ label, value }) => (
            <Button
              aria-pressed={filters.quickFilter === value}
              className="text-muted-strong hover:bg-surface-hover aria-pressed:border-primary/30 aria-pressed:bg-primary/10 aria-pressed:text-primary min-h-11 min-w-11 rounded-full border border-transparent px-3 text-xs font-bold"
              key={value}
              onClick={() => onFilterChange("quickFilter", value)}
              type="button"
              variant="ghost"
            >
              {value === "favorites" ? (
                <Heart aria-hidden="true" className="size-3.5" />
              ) : null}
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {hasChanges ? (
            <Button
              className="text-muted-foreground min-h-11 px-3 text-xs font-bold"
              onClick={onClear}
              type="button"
              variant="ghost"
            >
              Reset filters
            </Button>
          ) : null}
          <Button
            aria-controls={`${id}-controls`}
            aria-expanded={isOpen}
            aria-label={isOpen ? "Hide filters" : "Show filters"}
            className="data-active:border-primary/50 data-active:text-primary h-11 gap-2 px-3 text-xs font-bold"
            data-active={activeFilterCount > 0 || undefined}
            onClick={onToggle}
            type="button"
            variant="outline"
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            Filters
            {activeFilterCount > 0 ? (
              <Badge
                className="bg-primary/15 text-primary px-1.5"
                variant="secondary"
              >
                <span className="sr-only">Active filters: </span>
                {activeFilterCount}
              </Badge>
            ) : null}
            <ChevronDown
              aria-hidden="true"
              className={`size-3.5 ${isOpen ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div
        className="bg-surface border-border mt-3 grid grid-cols-1 gap-3 rounded-xl border p-3 min-[400px]:grid-cols-2 lg:grid-cols-4"
        hidden={!isOpen}
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
          label="Time signature"
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
          label="Subdivision / grid"
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
          defaultValue={defaultPatternSort}
          label="Sort order"
          onChange={(value) => onSortChange(value as PatternSort)}
          options={[
            { label: "Recommended", value: "recommended" },
            { label: "Name", value: "name" },
            { label: "Default BPM", value: "bpm" },
            { label: "Recently used", value: "recent" },
            { label: "Favorites first", value: "favorites" },
          ]}
          value={sort}
        />
      </div>
    </section>
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
        <SelectContent className="max-h-[min(20rem,var(--available-height))]">
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
