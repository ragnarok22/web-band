"use client";

import { Drum, Settings2, SlidersHorizontal, Volume2 } from "lucide-react";
import Link from "next/link";

import { CompactMixer } from "@/components/practice/compact-mixer";
import { GrooveControls } from "@/components/practice/groove-controls";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { usePracticeController } from "@/hooks/use-practice-controller";
import { usePracticeStore } from "@/stores/practice-store";
import type { SoundCharacter } from "@/types/audio";

export function PracticeSettings({
  practice,
}: {
  practice: ReturnType<typeof usePracticeController>;
}) {
  const character = usePracticeStore((state) => state.soundCharacter);
  const setCharacter = usePracticeStore((state) => state.setSoundCharacter);
  return (
    <Accordion defaultValue={["sound"]} multiple className="px-4">
      <AccordionItem value="sound">
        <AccordionTrigger className="min-h-14 items-center font-bold">
          <span className="flex items-center gap-3">
            <Volume2 aria-hidden="true" className="text-primary size-4" />
            Sound
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <CompactMixer
            embedded
            disabled={!practice.isReady}
            masterMuted={practice.masterMuted}
            masterVolume={practice.masterVolume}
            mixer={practice.mixer}
            onMasterMuteToggle={practice.toggleMasterMute}
            onMasterVolumeChange={practice.changeMasterVolume}
            onMutedChange={practice.changeMixerMuted}
            onReset={practice.resetMixer}
            onSoloChange={practice.changeMixerSolo}
            onVolumeChange={practice.changeMixerVolume}
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="groove">
        <AccordionTrigger className="min-h-14 items-center font-bold">
          <span className="flex items-center gap-3">
            <SlidersHorizontal
              aria-hidden="true"
              className="text-primary size-4"
            />
            Groove Feel
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <GrooveControls
            embedded
            disabled={!practice.isReady}
            fillFrequency={practice.fillFrequency}
            humanization={practice.humanization}
            onFillFrequencyChange={practice.changeFillFrequency}
            onHumanizationChange={practice.changeHumanization}
            onSwingChange={practice.changeSwing}
            swing={practice.swing}
          />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="kit">
        <AccordionTrigger className="min-h-14 items-center font-bold">
          <span className="flex items-center gap-3">
            <Drum aria-hidden="true" className="text-primary size-4" />
            Drum Kit
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <label
            className="text-muted-strong grid gap-2 text-xs font-bold"
            htmlFor="practice-sound-character"
          >
            Sound character
            <NativeSelect
              id="practice-sound-character"
              disabled={!practice.isReady}
              value={character}
              onChange={(event) =>
                setCharacter(event.target.value as SoundCharacter)
              }
            >
              <option value="soft">Soft</option>
              <option value="balanced">Balanced</option>
              <option value="punchy">Punchy</option>
            </NativeSelect>
          </label>
          <p className="text-muted-foreground mt-2 text-xs leading-5">
            Applies when you start or resume playback. All sounds are
            synthesized.
          </p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="advanced">
        <AccordionTrigger className="min-h-14 items-center font-bold">
          <span className="flex items-center gap-3">
            <Settings2 aria-hidden="true" className="text-primary size-4" />
            Advanced
          </span>
        </AccordionTrigger>
        <AccordionContent className="grid gap-3 pb-4">
          <Button
            aria-label="Keep awake while playing"
            aria-pressed={practice.wakeLockEnabled}
            aria-describedby={
              practice.wakeLockStatus === "error" ||
              practice.wakeLockStatus === "unsupported"
                ? "wake-lock-status"
                : undefined
            }
            disabled={!practice.isReady}
            variant="outline"
            className="min-h-11 w-full"
            onClick={() =>
              practice.setWakeLockEnabled(!practice.wakeLockEnabled)
            }
          >
            Keep awake while playing
          </Button>
          <Link
            href="/settings"
            className="text-primary flex min-h-11 items-center rounded-lg text-sm font-bold"
          >
            All application settings
          </Link>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
