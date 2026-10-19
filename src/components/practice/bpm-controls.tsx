"use client";

import { Hand, RotateCcw } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Kbd } from "@/components/ui/kbd";
import { Card } from "@/components/ui/card";

import type { BpmAdjustmentStep } from "@/hooks/use-practice-shortcuts";
import { clampBpm, MAX_BPM, MIN_BPM } from "@/lib/musical-time";

interface BpmControlsProps {
  embedded?: boolean;
  adjustmentStep?: BpmAdjustmentStep;
  bpm: number;
  defaultBpm: number;
  disabled?: boolean;
  onChange: (bpm: number) => void;
  onCommit?: (bpm: number) => void;
  onTap: () => void;
}

export function BpmControls({
  embedded = false,
  adjustmentStep = 1,
  bpm,
  defaultBpm,
  disabled = false,
  onChange,
  onCommit,
  onTap,
}: BpmControlsProps) {
  const alternateStep = adjustmentStep === 1 ? 5 : 1;
  const adjustments = [
    -adjustmentStep,
    adjustmentStep,
    -alternateStep,
    alternateStep,
  ];

  function commitDraft(input: HTMLInputElement): void {
    const parsed = Number(input.value);
    const nextBpm = clampBpm(parsed, bpm);
    input.value = String(nextBpm);
    onChange(nextBpm);
    onCommit?.(nextBpm);
  }

  function changeAndCommit(nextBpm: number): void {
    const clampedBpm = clampBpm(nextBpm, bpm);
    onChange(clampedBpm);
    onCommit?.(clampedBpm);
  }

  return (
    <Card
      role="region"
      aria-labelledby="tempo-heading"
      className={
        embedded
          ? "w-full max-w-md gap-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0"
          : "gap-0 p-4 sm:p-5"
      }
    >
      {!embedded && (
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-bold tracking-[0.18em] uppercase">
              Tempo
            </p>
            <h2
              className={
                embedded ? "sr-only" : "text-foreground mt-1 text-lg font-bold"
              }
              id="tempo-heading"
            >
              Set your pace
            </h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Reset tempo to ${defaultBpm} BPM`}
            className="border-border text-muted-strong hover:border-border-strong hover:bg-surface-hover hover:text-foreground flex min-h-11 min-w-11 items-center justify-center rounded-lg border transition-colors"
            disabled={disabled}
            onClick={() => changeAndCommit(defaultBpm)}
            title="Reset to pattern default"
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
          </Button>
        </div>
      )}

      <h2 className="sr-only" id={embedded ? "tempo-heading" : undefined}>
        {embedded ? "Set your pace" : null}
      </h2>
      <div className="mb-3 flex items-center justify-center gap-2 sm:gap-3">
        {embedded ? (
          <Button
            variant="outline"
            className="size-11"
            aria-label={`Decrease BPM by ${adjustmentStep}`}
            data-default-adjustment
            onClick={() => changeAndCommit(bpm - adjustmentStep)}
            disabled={disabled}
          >
            −
          </Button>
        ) : null}
        <Input
          aria-label="Current BPM"
          className={cn(
            "focus-visible:border-primary h-auto shrink-0 [appearance:textfield] rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-1 text-center leading-none tabular-nums focus-visible:ring-0 focus-visible:outline-0 dark:bg-transparent [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
            embedded
              ? "w-28 text-5xl font-extrabold tracking-tight md:text-5xl"
              : "w-32 text-6xl font-black tracking-[-0.06em] md:text-6xl",
          )}
          defaultValue={bpm}
          disabled={disabled}
          inputMode="numeric"
          key={bpm}
          max={MAX_BPM}
          min={MIN_BPM}
          onBlur={(event) => commitDraft(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          type="number"
        />
        <span className="text-muted-foreground pb-1 text-sm font-extrabold tracking-[0.16em] uppercase">
          BPM
        </span>
        {embedded ? (
          <Button
            variant="outline"
            className="size-11"
            aria-label={`Increase BPM by ${adjustmentStep}`}
            data-default-adjustment
            onClick={() => changeAndCommit(bpm + adjustmentStep)}
            disabled={disabled}
          >
            +
          </Button>
        ) : null}
      </div>

      <Slider
        aria-label="Tempo"
        aria-valuetext={`${bpm} BPM`}
        className={embedded ? "mb-2" : "mb-5"}
        disabled={disabled}
        max={MAX_BPM}
        min={MIN_BPM}
        onValueChange={(value) => onChange(Number(value))}
        onValueCommitted={(value) => onCommit?.(Number(value))}
        step={1}
        value={bpm}
      />

      <div
        aria-label="BPM adjustments"
        className={
          embedded
            ? "flex items-center justify-center gap-2"
            : "grid grid-cols-4 gap-2"
        }
        role="group"
      >
        {adjustments
          .filter(
            (adjustment) =>
              !embedded || Math.abs(adjustment) !== adjustmentStep,
          )
          .map((adjustment) => {
            const isDefault = Math.abs(adjustment) === adjustmentStep;

            return (
              <Button
                variant={isDefault ? "secondary" : "outline"}
                aria-label={`${adjustment > 0 ? "Increase" : "Decrease"} BPM by ${Math.abs(adjustment)}`}
                className={`hover:bg-surface-hover hover:text-foreground min-h-11 min-w-11 rounded-lg border text-sm font-extrabold tabular-nums transition-colors active:translate-y-px ${
                  isDefault
                    ? "border-primary/45 bg-primary/10 text-primary hover:border-primary/65"
                    : "border-border bg-surface-elevated text-muted-strong hover:border-border-strong"
                }`}
                data-default-adjustment={isDefault}
                disabled={disabled}
                key={adjustment}
                onClick={() => changeAndCommit(bpm + adjustment)}
                title={isDefault ? "Default BPM adjustment" : undefined}
                type="button"
              >
                {adjustment > 0 ? `+${adjustment}` : adjustment}
              </Button>
            );
          })}
        {embedded ? (
          <Button
            aria-label={`Reset tempo to ${defaultBpm} BPM`}
            title="Reset to pattern default"
            variant="ghost"
            className="size-11"
            disabled={disabled}
            onClick={() => changeAndCommit(defaultBpm)}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>
      <Button
        variant="secondary"
        className="text-primary mt-3 min-h-11 w-full gap-2"
        disabled={disabled}
        onClick={onTap}
        type="button"
      >
        <Hand aria-hidden="true" className="size-4" />
        Tap tempo <Kbd>T</Kbd>
      </Button>
    </Card>
  );
}
