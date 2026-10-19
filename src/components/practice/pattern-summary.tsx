"use client";

import {
  ChevronDown,
  LibraryBig,
  ListMusic,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { DialogTitle } from "@/components/ui/dialog";
import { formatPatternCategory } from "@/lib/pattern-filters";
import type { DrumPattern } from "@/types/pattern";

interface PatternSummaryProps {
  accompaniment?: boolean;
  immediatePatternSwitch: boolean;
  onImmediatePatternSwitchChange: (enabled: boolean) => void;
  onPatternChange: (patternId: string) => void;
  pattern: DrumPattern;
  patterns: DrumPattern[];
  pendingPatternId: string | null;
  swing: number;
}

export function PatternSummary({
  accompaniment = false,
  immediatePatternSwitch,
  onImmediatePatternSwitchChange,
  onPatternChange,
  pattern,
  patterns,
  pendingPatternId,
  swing,
}: PatternSummaryProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedPattern =
    patterns.find(({ id }) => id === (pendingPatternId ?? pattern.id)) ??
    pattern;

  return (
    <section
      aria-label={accompaniment ? "Drum accompaniment" : "Current groove"}
      className="border-border bg-surface min-w-0 rounded-2xl border px-4 py-3 sm:px-5"
    >
      <Collapsible>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1 basis-52">
            <p className="text-primary text-[0.65rem] font-extrabold tracking-[0.16em] uppercase">
              {accompaniment ? "Drum accompaniment" : "Current groove"}
            </p>
            <h2 className="text-foreground mt-1 text-lg leading-snug font-extrabold tracking-tight wrap-anywhere sm:text-xl">
              {pattern.name}
            </h2>
            <div className="text-muted-strong mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span>{formatPatternCategory(pattern.category)}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{pattern.difficulty}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {pattern.timeSignature.numerator}/
                {pattern.timeSignature.denominator}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CollapsibleTrigger
              render={<Button variant="ghost" />}
              className="group/details text-muted-strong min-h-11 gap-1.5 px-1 text-xs font-bold sm:px-2"
            >
              <ListMusic
                aria-hidden="true"
                className="hidden size-4 sm:block"
              />
              Pattern Details
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform group-aria-expanded/details:rotate-180 motion-reduce:transition-none"
              />
            </CollapsibleTrigger>
            <Button
              variant="outline"
              className="min-h-11 gap-2 px-2 text-xs sm:px-3 sm:text-sm"
              onClick={() => setPickerOpen(true)}
            >
              <SlidersHorizontal
                aria-hidden="true"
                className="hidden size-4 sm:block"
              />
              {accompaniment ? "Change Groove" : "Change Pattern"}
            </Button>
          </div>
        </div>
        {pendingPatternId ? (
          <p className="text-secondary-accent mt-3 text-xs font-bold">
            <span className="block">Queued after a transition fill</span>
            {selectedPattern.name}
          </p>
        ) : null}
        <CollapsibleContent className="border-border mt-3 border-t pt-3">
          <p className="text-muted-strong text-sm leading-6">
            {pattern.description}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Feel</dt>
              <dd className="mt-1 font-bold">
                {swing > 0 ? "Swing" : "Straight"} {pattern.subdivision}ths
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Default BPM</dt>
              <dd className="mt-1 font-bold">{pattern.defaultBpm}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Recommended BPM</dt>
              <dd className="mt-1 font-bold">
                {pattern.recommendedBpmRange.min}–
                {pattern.recommendedBpmRange.max}
              </dd>
            </div>
          </dl>
          <label className="text-muted-strong mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-xs leading-5 font-bold">
            <Checkbox
              checked={immediatePatternSwitch}
              onCheckedChange={onImmediatePatternSwitchChange}
            />
            Switch same-meter patterns immediately
          </label>
        </CollapsibleContent>
      </Collapsible>
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        className="sm:max-w-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <DialogTitle>
            {accompaniment ? "Change Groove" : "Change Pattern"}
          </DialogTitle>
          <Button
            aria-label="Close pattern picker"
            variant="ghost"
            className="size-11"
            onClick={() => setPickerOpen(false)}
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>
        <p className="text-muted-strong text-sm">
          Find a groove. Changes during playback use the existing transition
          fill.
        </p>
        <Combobox
          items={patterns}
          value={selectedPattern}
          itemToStringLabel={formatQuickPattern}
          itemToStringValue={(item: DrumPattern) => item.id}
          isItemEqualToValue={(item, value) => item.id === value.id}
          onValueChange={(item) => {
            if (item) {
              onPatternChange(item.id);
              setPickerOpen(false);
            }
          }}
          autoHighlight
        >
          <ComboboxInput
            aria-label="Current pattern"
            placeholder="Search patterns…"
            className="min-h-11 w-full [&_input]:min-h-11"
          />
          <ComboboxContent>
            <ComboboxEmpty>No patterns found.</ComboboxEmpty>
            <ComboboxList>
              {(candidate: DrumPattern) => (
                <ComboboxItem
                  key={candidate.id}
                  value={candidate}
                  className="min-h-11"
                >
                  {formatQuickPattern(candidate)}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <Link
          className="text-primary flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold"
          href="/patterns"
        >
          <LibraryBig aria-hidden="true" className="size-4" />
          Browse all patterns
        </Link>
      </Modal>
    </section>
  );
}

function formatQuickPattern(pattern: DrumPattern): string {
  return `${pattern.name} - ${pattern.timeSignature.numerator}/${pattern.timeSignature.denominator}`;
}
