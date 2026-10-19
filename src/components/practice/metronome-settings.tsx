"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { NativeSelect } from "@/components/ui/native-select";
import type { usePracticeController } from "@/hooks/use-practice-controller";
import type { MetronomeConfiguration } from "@/types/practice";

export function MetronomeSettings({
  practice,
}: {
  practice: ReturnType<typeof usePracticeController>;
}) {
  const config = practice.metronome;
  const disabled = !practice.isReady || practice.status === "initializing";
  const levels = [
    { key: "metronomeVolume", label: "Metronome volume" },
    { key: "subdivisionVolume", label: "Subdivision volume" },
    { key: "accentIntensity", label: "Accent intensity" },
  ] as const;
  return (
    <Accordion defaultValue={["sound"]} multiple className="px-4">
      <AccordionItem value="sound">
        <AccordionTrigger className="min-h-14 font-bold">
          Sound
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div>
            <p className="text-muted-strong text-xs font-bold">Master volume</p>
            <Slider
              aria-label="Master"
              value={practice.masterMuted ? 0 : practice.masterVolume}
              min={0}
              max={1}
              step={0.01}
              disabled={disabled}
              onValueChange={(value) =>
                practice.changeMasterVolume(Number(value))
              }
            />
            <Button
              variant="outline"
              className="min-h-11 w-full"
              aria-pressed={practice.masterMuted}
              onClick={practice.toggleMasterMute}
              disabled={disabled}
            >
              Mute master
            </Button>
          </div>
          {levels.map(({ key, label }) => (
            <div key={key}>
              <p className="text-muted-strong text-xs font-bold">{label}</p>
              <Slider
                aria-label={label}
                aria-valuetext={`${Math.round(config[key] * 100)} percent`}
                value={config[key]}
                min={0}
                max={1}
                step={0.01}
                disabled={disabled}
                onValueChange={(value) =>
                  practice.changeMetronome({ ...config, [key]: Number(value) })
                }
              />
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="rhythm">
        <AccordionTrigger className="min-h-14 font-bold">
          Rhythm
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <p className="text-muted-foreground text-xs leading-5">
            Choose meter and subdivision in the player. Tap its large beat
            indicators to customize accents; rhythm edits enter at the next safe
            bar. Stop before changing meter.
          </p>
          <Button
            variant="outline"
            className="min-h-11 w-full"
            disabled={disabled}
            onClick={() =>
              practice.changeMetronome({
                ...config,
                accentPattern: config.accentPattern.map(
                  (_, index) => index === 0,
                ),
              })
            }
          >
            Reset beat accents
          </Button>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="training">
        <AccordionTrigger className="min-h-14 font-bold">
          Training
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <label className="text-muted-strong grid gap-2 text-xs font-bold">
            Measures per stage
            <NativeSelect
              aria-label="Measures per stage"
              disabled={disabled || practice.active}
              value={String(config.measuresPerStage)}
              onChange={(event) =>
                practice.changeMetronome({
                  ...config,
                  measuresPerStage: Number(
                    event.target.value,
                  ) as MetronomeConfiguration["measuresPerStage"],
                })
              }
            >
              {[2, 4, 8, 16].map((bars) => (
                <option key={bars} value={bars}>
                  {bars} bars
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="text-muted-strong grid gap-2 text-xs font-bold">
            After the final stage
            <NativeSelect
              aria-label="After the final stage"
              disabled={disabled || practice.active}
              value={config.endBehavior}
              onChange={(event) =>
                practice.changeMetronome({
                  ...config,
                  endBehavior: event.target
                    .value as MetronomeConfiguration["endBehavior"],
                })
              }
            >
              <option value="repeat">Repeat progression</option>
              <option value="hold">Hold final subdivision</option>
              <option value="stop">Stop training</option>
            </NativeSelect>
          </label>
          <p className="text-muted-foreground text-xs leading-5">
            Subdivision density increases; BPM stays constant. Stop before
            changing training setup.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="advanced">
        <AccordionTrigger className="min-h-14 font-bold">
          Advanced
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <Button
            variant="outline"
            className="min-h-11 w-full"
            aria-pressed={practice.wakeLockEnabled}
            disabled={disabled}
            onClick={() =>
              practice.setWakeLockEnabled(!practice.wakeLockEnabled)
            }
          >
            Keep awake while playing
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
