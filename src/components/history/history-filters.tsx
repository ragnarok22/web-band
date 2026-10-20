"use client";

import { useId } from "react";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  historyModeLabels,
  historyModes,
  type HistoryFilterValues,
} from "@/lib/practice-history";

export function HistoryFilters({
  value,
  onChange,
  count,
}: {
  value: HistoryFilterValues;
  onChange: (value: HistoryFilterValues) => void;
  count: number;
}) {
  const id = useId();
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <div className="min-w-0 sm:w-40">
          <label className="sr-only" htmlFor={`${id}-mode`}>
            Practice mode
          </label>
          <NativeSelect
            id={`${id}-mode`}
            value={value.mode}
            onChange={(event) =>
              onChange({
                ...value,
                mode: event.target.value as HistoryFilterValues["mode"],
              })
            }
          >
            <NativeSelectOption value="all">All modes</NativeSelectOption>
            {historyModes.map((mode) => (
              <NativeSelectOption key={mode} value={mode}>
                {historyModeLabels[mode]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="min-w-0 sm:w-40">
          <label className="sr-only" htmlFor={`${id}-range`}>
            Date range
          </label>
          <NativeSelect
            id={`${id}-range`}
            value={value.range}
            onChange={(event) =>
              onChange({
                ...value,
                range: event.target.value as HistoryFilterValues["range"],
              })
            }
          >
            <NativeSelectOption value="all">All time</NativeSelectOption>
            <NativeSelectOption value="7">Last 7 days</NativeSelectOption>
            <NativeSelectOption value="30">Last 30 days</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="col-span-2 min-w-0 sm:ml-auto sm:w-44">
          <label className="sr-only" htmlFor={`${id}-sort`}>
            Sort sessions
          </label>
          <NativeSelect
            aria-describedby={
              value.sort === "longest" ? `${id}-sort-help` : undefined
            }
            id={`${id}-sort`}
            value={value.sort}
            onChange={(event) =>
              onChange({
                ...value,
                sort: event.target.value as HistoryFilterValues["sort"],
              })
            }
          >
            <NativeSelectOption value="newest">Newest first</NativeSelectOption>
            <NativeSelectOption value="oldest">Oldest first</NativeSelectOption>
            <NativeSelectOption value="longest">
              Longest session
            </NativeSelectOption>
          </NativeSelect>
        </div>
      </div>
      <p
        aria-live="polite"
        className="text-muted-foreground mt-3 text-xs"
        role="status"
      >
        {count} matching {count === 1 ? "session" : "sessions"}
      </p>
      {value.sort === "longest" ? (
        <p
          className="text-muted-foreground mt-1 text-xs"
          id={`${id}-sort-help`}
        >
          Days ranked by their longest session; longest first within each day.
        </p>
      ) : null}
    </div>
  );
}
