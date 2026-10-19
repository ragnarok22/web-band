"use client";

import { RotateCcw, SlidersVertical, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";

import { mixerGroups } from "@/lib/mixer";
import type { MixerGroup, MixerSettings } from "@/types/audio";

interface CompactMixerProps {
  embedded?: boolean;
  disabled?: boolean;
  masterMuted: boolean;
  masterVolume: number;
  mixer: MixerSettings;
  onMasterMuteToggle: () => void;
  onMasterVolumeChange: (volume: number) => void;
  onMutedChange: (group: MixerGroup, muted: boolean) => void;
  onReset: () => void;
  onSoloChange: (group: MixerGroup, solo: boolean) => void;
  onVolumeChange: (group: MixerGroup, volume: number) => void;
}

const groupLabels: Record<MixerGroup, string> = {
  cymbals: "Cymbals",
  hiHat: "Hi-hat",
  kick: "Kick",
  percussion: "Rim + clap",
  snare: "Snare",
  toms: "Toms",
};

export function CompactMixer({
  embedded = false,
  disabled = false,
  masterMuted,
  masterVolume,
  mixer,
  onMasterMuteToggle,
  onMasterVolumeChange,
  onMutedChange,
  onReset,
  onSoloChange,
  onVolumeChange,
}: CompactMixerProps) {
  const masterPercent = Math.round(masterVolume * 100);

  return (
    <Card
      role="region"
      aria-labelledby="mixer-heading"
      className={
        embedded
          ? "gap-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0"
          : "gap-0 p-4 sm:p-5"
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`${embedded ? "hidden" : "flex"} bg-surface-elevated text-primary size-10 items-center justify-center rounded-lg`}
          >
            <SlidersVertical aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-foreground font-bold" id="mixer-heading">
              Kit mixer
            </h2>
            {embedded ? null : (
              <p className="text-muted-foreground text-xs">
                Six musical groups
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Reset mixer"
          className="border-border text-muted-strong hover:bg-surface-hover hover:text-foreground flex size-11 items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-45"
          disabled={disabled}
          onClick={onReset}
          title="Reset mixer"
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div className="border-border mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b pb-4">
        <Toggle
          aria-label="Master mute"
          pressed={masterMuted}
          className={`flex size-11 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-45 ${masterMuted ? "bg-danger/15 text-danger" : "bg-surface-elevated text-primary"}`}
          disabled={disabled}
          onPressedChange={onMasterMuteToggle}
          type="button"
        >
          {masterMuted ? (
            <VolumeX aria-hidden="true" className="size-5" />
          ) : (
            <Volume2 aria-hidden="true" className="size-5" />
          )}
        </Toggle>
        <div className="text-muted-strong text-xs font-bold">
          Master
          <Slider
            aria-label="Master"
            aria-valuetext={`${masterPercent} percent`}
            className="mt-2"
            id="mixer-master"
            max={1}
            min={0}
            disabled={disabled}
            onValueChange={(value) => onMasterVolumeChange(Number(value))}
            step={0.01}
            value={masterVolume}
          />
        </div>
        <output
          className="text-muted-foreground w-10 text-right text-xs font-extrabold tabular-nums"
          htmlFor="mixer-master"
        >
          {masterPercent}%
        </output>
      </div>

      <div className="grid gap-2">
        {mixerGroups.map((group) => {
          const channel = mixer[group];
          const percentage = Math.round(channel.volume * 100);
          return (
            <div
              className="bg-surface-elevated grid grid-cols-[minmax(4.5rem,auto)_1fr_auto_auto] items-center gap-1 rounded-lg p-2"
              key={group}
            >
              <span className="text-foreground text-xs font-extrabold">
                {groupLabels[group]}
              </span>
              <Slider
                aria-label={`${groupLabels[group]} volume`}
                aria-valuetext={`${percentage} percent`}
                className="min-w-0"
                id={`mixer-${group}`}
                max={1}
                min={0}
                disabled={disabled}
                onValueChange={(value) => onVolumeChange(group, Number(value))}
                step={0.01}
                value={channel.volume}
              />
              <Toggle
                aria-label={`Mute ${groupLabels[group]}`}
                pressed={channel.muted}
                className={`size-11 rounded-md text-xs font-black ${channel.muted ? "bg-danger/15 text-danger" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"}`}
                disabled={disabled}
                onPressedChange={(pressed) => onMutedChange(group, pressed)}
                type="button"
              >
                M
              </Toggle>
              <Toggle
                aria-label={`Solo ${groupLabels[group]}`}
                pressed={channel.solo}
                className={`size-11 rounded-md text-xs font-black ${channel.solo ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"}`}
                disabled={disabled}
                onPressedChange={(pressed) => onSoloChange(group, pressed)}
                type="button"
              >
                S
              </Toggle>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
