"use client";

import { Volume1, Volume2, VolumeX } from "lucide-react";

interface MasterVolumeProps {
  onChange: (volume: number) => void;
  volume: number;
}

export function MasterVolume({ onChange, volume }: MasterVolumeProps) {
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const percentage = Math.round(volume * 100);

  return (
    <section
      aria-labelledby="volume-heading"
      className="border-border bg-surface rounded-2xl border p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-surface-elevated text-accent flex size-10 items-center justify-center rounded-lg">
            <VolumeIcon aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-foreground font-bold" id="volume-heading">
              Master volume
            </h2>
            <p className="text-muted text-xs">Synthesized kit output</p>
          </div>
        </div>
        <output
          className="text-muted-strong text-sm font-extrabold tabular-nums"
          htmlFor="master-volume"
        >
          {percentage}%
        </output>
      </div>
      <input
        aria-label="Master volume"
        aria-valuetext={`${percentage} percent`}
        className="tempo-range w-full"
        id="master-volume"
        max={1}
        min={0}
        onChange={(event) => onChange(Number(event.target.value))}
        step={0.01}
        type="range"
        value={volume}
      />
    </section>
  );
}
