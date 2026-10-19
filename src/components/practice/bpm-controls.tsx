"use client";

import { Hand, RotateCcw, SlidersHorizontal } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Kbd } from "@/components/ui/kbd";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { BpmAdjustmentStep } from "@/hooks/use-practice-shortcuts";
import { clampBpm, MAX_BPM, MIN_BPM } from "@/lib/musical-time";

interface BpmControlsProps {
  embedded?: boolean;
  showTapTempo?: boolean;
  adjustmentStep?: BpmAdjustmentStep;
  bpm: number;
  defaultBpm: number;
  resetDescription?: string;
  disabled?: boolean;
  onChange: (bpm: number) => void;
  onCommit?: (bpm: number) => void;
  onTap: () => void;
}

export function BpmControls({
  embedded = false,
  showTapTempo = true,
  adjustmentStep = 1,
  bpm,
  defaultBpm,
  resetDescription = "Reset to pattern default",
  disabled = false,
  onChange,
  onCommit,
  onTap,
}: BpmControlsProps) {
  function changeAndCommit(value: number): number {
    const nextBpm = clampBpm(value, bpm);
    onChange(nextBpm);
    onCommit?.(nextBpm);
    return nextBpm;
  }

  const adjustmentProps = {
    adjustmentStep,
    bpm,
    disabled,
    embedded,
    onChange: changeAndCommit,
  };
  const alternateStep = adjustmentStep === 1 ? 5 : 1;
  const secondaryAdjustments = embedded
    ? [-5, 5]
    : [-adjustmentStep, adjustmentStep, -alternateStep, alternateStep];

  const reset = (
    <BpmReset
      defaultBpm={defaultBpm}
      resetDescription={resetDescription}
      disabled={disabled}
      embedded={embedded}
      onChange={changeAndCommit}
    />
  );
  const secondaryControls = (
    <>
      <Slider
        aria-label="Tempo"
        aria-valuetext={`${bpm} BPM`}
        className="mb-3"
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
          embedded ? "flex items-center gap-2" : "grid grid-cols-4 gap-2"
        }
        role="group"
      >
        {secondaryAdjustments.map((adjustment) => (
          <BpmAdjustment
            {...adjustmentProps}
            adjustment={adjustment}
            key={adjustment}
          />
        ))}
        {embedded ? reset : null}
      </div>
    </>
  );
  const Container = embedded ? "section" : Card;

  return (
    <Container
      role="region"
      aria-label="Set your pace"
      className={embedded ? "min-w-0" : "gap-0 p-4 sm:p-5"}
    >
      {!embedded ? (
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-bold tracking-[0.18em] uppercase">
              Tempo
            </p>
            <h2 className="text-foreground mt-1 text-lg font-bold">
              Set your pace
            </h2>
          </div>
          {reset}
        </div>
      ) : null}
      <Popover modal={false}>
        <div
          className={cn(
            "flex items-center justify-center gap-1",
            !embedded && "mb-3",
          )}
        >
          {embedded ? (
            <BpmAdjustment {...adjustmentProps} adjustment={-1} />
          ) : null}
          <Input
            aria-label="Current BPM"
            className={cn(
              "focus-visible:border-primary h-12 shrink-0 [appearance:textfield] rounded-none border-x-0 border-t-0 border-b border-transparent bg-transparent px-1 text-center leading-none tabular-nums focus-visible:ring-0 focus-visible:outline-0 dark:bg-transparent [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none",
              embedded
                ? "w-18 text-3xl font-extrabold tracking-tight md:text-3xl"
                : "h-auto w-32 text-6xl font-black tracking-[-0.06em] md:text-6xl",
            )}
            defaultValue={bpm}
            disabled={disabled}
            inputMode="numeric"
            key={bpm}
            max={MAX_BPM}
            min={MIN_BPM}
            onBlur={(event) => {
              event.currentTarget.value = String(
                changeAndCommit(Number(event.currentTarget.value)),
              );
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            type="number"
          />
          <span className="text-muted-foreground mr-1 text-xs font-extrabold tracking-wider">
            BPM
          </span>
          {embedded ? (
            <>
              <BpmAdjustment {...adjustmentProps} adjustment={1} />
              <Tooltip disabled={disabled}>
                <TooltipTrigger
                  aria-label="More tempo controls"
                  render={
                    <PopoverTrigger
                      render={<Button variant="ghost" size="icon" />}
                      className="text-muted-strong aria-expanded:border-primary/35 aria-expanded:bg-primary/10 aria-expanded:text-primary size-11"
                      disabled={disabled}
                    />
                  }
                >
                  <SlidersHorizontal aria-hidden="true" className="size-4" />
                </TooltipTrigger>
                <TooltipContent>More tempo options</TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </div>
        {embedded ? (
          <PopoverContent className="[&_[data-slot=slider-track]]:bg-border-strong">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <PopoverTitle>Tempo options</PopoverTitle>
              <PopoverDescription className="tabular-nums">
                {MIN_BPM}–{MAX_BPM} BPM
              </PopoverDescription>
            </div>
            {secondaryControls}
          </PopoverContent>
        ) : (
          secondaryControls
        )}
      </Popover>
      {showTapTempo ? (
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
      ) : null}
    </Container>
  );
}

function BpmReset({
  defaultBpm,
  resetDescription,
  disabled,
  embedded,
  onChange,
}: Pick<
  BpmControlsProps,
  "defaultBpm" | "resetDescription" | "disabled" | "embedded" | "onChange"
>) {
  return (
    <Button
      aria-label={`Reset tempo to ${defaultBpm} BPM`}
      title={resetDescription}
      variant="ghost"
      className={cn("min-h-11 gap-2 px-2", embedded && "ml-auto")}
      disabled={disabled}
      onClick={() => onChange(defaultBpm)}
      type="button"
    >
      <RotateCcw aria-hidden="true" className="size-4" />
      {embedded ? "Reset" : null}
    </Button>
  );
}

function BpmAdjustment({
  adjustment,
  adjustmentStep,
  bpm,
  disabled,
  embedded,
  onChange,
}: Pick<
  BpmControlsProps,
  "adjustmentStep" | "bpm" | "disabled" | "embedded" | "onChange"
> & { adjustment: number }) {
  const isDefault = Math.abs(adjustment) === adjustmentStep;
  const label =
    embedded && Math.abs(adjustment) === 1
      ? adjustment > 0
        ? "+"
        : "−"
      : adjustment > 0
        ? `+${adjustment}`
        : adjustment;
  return (
    <Button
      variant={isDefault && !embedded ? "secondary" : "outline"}
      aria-label={`${adjustment > 0 ? "Increase" : "Decrease"} BPM by ${Math.abs(adjustment)}`}
      className="min-h-11 min-w-11 rounded-lg px-2 font-extrabold tabular-nums"
      data-default-adjustment={isDefault}
      disabled={disabled}
      onClick={() => onChange(bpm + adjustment)}
      type="button"
    >
      {label}
    </Button>
  );
}
