"use client";

import { RotateCcw, SlidersVertical, Volume2, VolumeX } from "lucide-react";

import { mixerGroups } from "@/lib/mixer";
import type { MixerGroup, MixerSettings } from "@/types/audio";

interface CompactMixerProps {
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
    <section
      aria-labelledby="mixer-heading"
      className="border-border bg-surface rounded-2xl border p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-surface-elevated text-accent flex size-10 items-center justify-center rounded-lg">
            <SlidersVertical aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-foreground font-bold" id="mixer-heading">
              Kit mixer
            </h2>
            <p className="text-muted text-xs">Six musical groups</p>
          </div>
        </div>
        <button
          aria-label="Reset mixer"
          className="border-border text-muted-strong hover:bg-surface-hover hover:text-foreground flex size-11 items-center justify-center rounded-lg border"
          onClick={onReset}
          title="Reset mixer"
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="border-border mb-3 grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b pb-4">
        <button
          aria-label={masterMuted ? "Unmute master" : "Mute master"}
          aria-pressed={masterMuted}
          className={`flex size-11 items-center justify-center rounded-lg ${masterMuted ? "bg-danger/15 text-danger" : "bg-surface-elevated text-accent"}`}
          onClick={onMasterMuteToggle}
          type="button"
        >
          {masterMuted ? (
            <VolumeX aria-hidden="true" className="size-5" />
          ) : (
            <Volume2 aria-hidden="true" className="size-5" />
          )}
        </button>
        <label
          className="text-muted-strong text-xs font-bold"
          htmlFor="mixer-master"
        >
          Master
          <input
            aria-valuetext={`${masterPercent} percent`}
            className="tempo-range mt-2 block w-full"
            id="mixer-master"
            max={1}
            min={0}
            onChange={(event) =>
              onMasterVolumeChange(Number(event.target.value))
            }
            step={0.01}
            type="range"
            value={masterVolume}
          />
        </label>
        <output
          className="text-muted w-10 text-right text-xs font-extrabold tabular-nums"
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
              <label
                className="text-foreground text-xs font-extrabold"
                htmlFor={`mixer-${group}`}
              >
                {groupLabels[group]}
              </label>
              <input
                aria-label={`${groupLabels[group]} volume`}
                aria-valuetext={`${percentage} percent`}
                className="tempo-range min-w-0"
                id={`mixer-${group}`}
                max={1}
                min={0}
                onChange={(event) =>
                  onVolumeChange(group, Number(event.target.value))
                }
                step={0.01}
                type="range"
                value={channel.volume}
              />
              <button
                aria-label={`Mute ${groupLabels[group]}`}
                aria-pressed={channel.muted}
                className={`size-11 rounded-md text-xs font-black ${channel.muted ? "bg-danger/15 text-danger" : "text-muted hover:bg-surface-hover hover:text-foreground"}`}
                onClick={() => onMutedChange(group, !channel.muted)}
                type="button"
              >
                M
              </button>
              <button
                aria-label={`Solo ${groupLabels[group]}`}
                aria-pressed={channel.solo}
                className={`size-11 rounded-md text-xs font-black ${channel.solo ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-hover hover:text-foreground"}`}
                onClick={() => onSoloChange(group, !channel.solo)}
                type="button"
              >
                S
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
