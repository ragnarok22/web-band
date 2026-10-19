"use client";

import { Database, Music2, Palette, SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import {
  MAX_HISTORY_MINIMUM_DURATION_SECONDS,
  MIN_HISTORY_MINIMUM_DURATION_SECONDS,
} from "@/lib/history-settings";
import { type ColorTheme, useAppearanceStore } from "@/stores/appearance-store";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePracticeStore } from "@/stores/practice-store";
import { useStorageStore } from "@/stores/storage-store";
import type { CountInMeasures, SoundCharacter } from "@/types/audio";
import type {
  BeatFlashIntensity,
  BpmAdjustmentStep,
  VisualSubdivisionDetail,
} from "@/types/persistence";

function PreferenceCard({
  id,
  icon,
  eyebrow,
  title,
  children,
}: {
  id: string;
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <Card className="py-5 sm:py-7">
        <CardHeader className="px-5 sm:px-7">
          {eyebrow ? (
            <p className="text-primary flex items-center gap-2 text-xs font-extrabold tracking-[0.16em] uppercase">
              {icon}
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-2 text-2xl font-black" id={id}>
            {title}
          </h2>
        </CardHeader>
        <CardContent className="px-5 sm:px-7">{children}</CardContent>
      </Card>
    </section>
  );
}

function Choice<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        disabled={disabled}
        value={value}
        onChange={(event) => {
          const option = options.find(
            ([candidate]) => String(candidate) === event.currentTarget.value,
          );
          if (option) onChange(option[0]);
        }}
      >
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}

function PreferenceCheck({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-4 text-sm font-bold">
      {label}
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </label>
  );
}

const gridClass = "border-border grid gap-5 border-t pt-5 sm:grid-cols-2";

export function AppearanceSettingsSection() {
  const hydrated = useAppearanceStore((state) => state.hasHydrated);
  const beatFlashIntensity = useAppearanceStore(
    (state) => state.beatFlashIntensity,
  );
  const reducedMotion = useAppearanceStore((state) => state.reducedMotion);
  const theme = useAppearanceStore((state) => state.theme);
  const visualSubdivisionDetail = useAppearanceStore(
    (state) => state.visualSubdivisionDetail,
  );
  const setBeatFlashIntensity = useAppearanceStore(
    (state) => state.setBeatFlashIntensity,
  );
  const setReducedMotion = useAppearanceStore(
    (state) => state.setReducedMotion,
  );
  const setTheme = useAppearanceStore((state) => state.setTheme);
  const setVisualSubdivisionDetail = useAppearanceStore(
    (state) => state.setVisualSubdivisionDetail,
  );
  return (
    <PreferenceCard
      id="appearance-settings-heading"
      icon={<Palette aria-hidden="true" className="size-4" />}
      eyebrow="Appearance"
      title="Tune the interface"
    >
      <div className={gridClass}>
        <Choice<ColorTheme>
          id="color-theme"
          label="Color theme"
          value={theme}
          onChange={setTheme}
          options={[
            ["dark", "Dark"],
            ["light", "Light"],
            ["system", "Use device setting"],
          ]}
        />
        <PreferenceCheck
          label="Reduce motion"
          checked={reducedMotion}
          disabled={!hydrated}
          onChange={setReducedMotion}
        />
        <Choice<VisualSubdivisionDetail>
          id="visual-detail"
          label="Visual subdivision detail"
          value={visualSubdivisionDetail}
          onChange={setVisualSubdivisionDetail}
          options={[
            ["beats", "Beats only"],
            ["pattern", "Match pattern"],
            ["sixteenths", "All sixteenths"],
          ]}
        />
        <Choice<BeatFlashIntensity>
          id="beat-intensity"
          label="Beat flash intensity"
          value={beatFlashIntensity}
          onChange={setBeatFlashIntensity}
          options={[
            ["minimal", "Minimal"],
            ["standard", "Standard"],
            ["strong", "Strong"],
          ]}
        />
      </div>
    </PreferenceCard>
  );
}

export function PracticeDefaultsSettingsSection() {
  const hydrated = usePracticeStore((state) => state.hasHydrated);
  const bpmAdjustmentStep = usePracticeStore(
    (state) => state.bpmAdjustmentStep,
  );
  const countInMeasures = usePracticeStore((state) => state.countInMeasures);
  const masterVolume = usePracticeStore((state) => state.masterVolume);
  const restoreLastPractice = usePracticeStore(
    (state) => state.restoreLastPractice,
  );
  const wakeLockEnabled = usePracticeStore((state) => state.wakeLockEnabled);
  const setBpmAdjustmentStep = usePracticeStore(
    (state) => state.setBpmAdjustmentStep,
  );
  const setCountInMeasures = usePracticeStore(
    (state) => state.setCountInMeasures,
  );
  const setMasterVolume = usePracticeStore((state) => state.setMasterVolume);
  const setRestoreLastPractice = usePracticeStore(
    (state) => state.setRestoreLastPractice,
  );
  const setWakeLockEnabled = usePracticeStore(
    (state) => state.setWakeLockEnabled,
  );
  return (
    <PreferenceCard
      id="practice-defaults-heading"
      icon={<SlidersHorizontal aria-hidden="true" className="size-4" />}
      eyebrow="Practice defaults"
      title="Start your way"
    >
      <div className={gridClass}>
        <Choice<CountInMeasures>
          id="default-count-in"
          label="Count-in"
          value={countInMeasures}
          disabled={!hydrated}
          onChange={setCountInMeasures}
          options={[
            [0, "Off"],
            [1, "1 measure"],
            [2, "2 measures"],
            [4, "4 measures"],
          ]}
        />
        <Choice<BpmAdjustmentStep>
          id="bpm-step"
          label="Default BPM adjustment"
          value={bpmAdjustmentStep}
          disabled={!hydrated}
          onChange={setBpmAdjustmentStep}
          options={[
            [1, "1 BPM"],
            [5, "5 BPM"],
          ]}
        />
        <Field className="sm:col-span-2">
          <FieldLabel
            htmlFor="master-volume"
            className="flex w-full justify-between"
          >
            Master volume
            <span
              aria-hidden="true"
              className="text-muted-foreground tabular-nums"
            >
              {Math.round(masterVolume * 100)}%
            </span>
          </FieldLabel>
          <Slider
            aria-label="Master volume"
            aria-valuetext={`${Math.round(masterVolume * 100)} percent`}
            id="master-volume"
            disabled={!hydrated}
            max={1}
            min={0}
            step={0.01}
            value={masterVolume}
            onValueChange={(value) => setMasterVolume(Number(value))}
          />
        </Field>
        <PreferenceCheck
          label="Keep screen awake while playing"
          checked={wakeLockEnabled}
          disabled={!hydrated}
          onChange={setWakeLockEnabled}
        />
        <PreferenceCheck
          label="Restore last practice setup"
          checked={restoreLastPractice}
          disabled={!hydrated}
          onChange={setRestoreLastPractice}
        />
      </div>
    </PreferenceCard>
  );
}

export function SoundSettingsSection() {
  const hydrated = usePracticeStore((state) => state.hasHydrated);
  const soundCharacter = usePracticeStore((state) => state.soundCharacter);
  const setSoundCharacter = usePracticeStore(
    (state) => state.setSoundCharacter,
  );
  return (
    <PreferenceCard
      id="sound-settings-heading"
      icon={<Music2 aria-hidden="true" className="size-4" />}
      eyebrow="Sound"
      title="Shape the kit"
    >
      <p className="text-muted-foreground mb-5 max-w-2xl text-sm leading-6">
        Choose a synthesized drum character for practice, previews, and the
        pattern editor. Balanced preserves the original Web Band kit.
      </p>
      <div className="max-w-sm">
        <Choice<SoundCharacter>
          id="sound-character"
          label="Sound character"
          value={soundCharacter}
          disabled={!hydrated}
          onChange={setSoundCharacter}
          options={[
            ["soft", "Soft"],
            ["balanced", "Balanced"],
            ["punchy", "Punchy"],
          ]}
        />
      </div>
    </PreferenceCard>
  );
}

export function HistorySettingsSection() {
  const enabled = useHistorySettingsStore((state) => state.enabled);
  const hydrated = useHistorySettingsStore((state) => state.hasHydrated);
  const minimumDuration = useHistorySettingsStore(
    (state) => state.minimumDurationSeconds,
  );
  const setEnabled = useHistorySettingsStore((state) => state.setEnabled);
  const setMinimumDuration = useHistorySettingsStore(
    (state) => state.setMinimumDurationSeconds,
  );
  const [minimumDurationInput, setMinimumDurationInput] = useState<
    string | null
  >(null);
  return (
    <PreferenceCard id="history-settings-heading" title="Practice history">
      <p className="text-muted-foreground mb-5 text-sm leading-6">
        Choose whether completed practice sessions become journal entries.
      </p>
      <div className={gridClass}>
        <PreferenceCheck
          label="Save practice history"
          checked={enabled}
          disabled={!hydrated}
          onChange={setEnabled}
        />
        <Field>
          <FieldLabel htmlFor="history-minimum-duration">
            Minimum session duration
          </FieldLabel>
          <div className="flex items-center gap-3">
            <Input
              id="history-minimum-duration"
              className="min-h-11"
              aria-describedby="history-duration-help"
              type="number"
              min={MIN_HISTORY_MINIMUM_DURATION_SECONDS}
              max={MAX_HISTORY_MINIMUM_DURATION_SECONDS}
              step={1}
              disabled={!hydrated}
              value={minimumDurationInput ?? minimumDuration}
              onBlur={() => setMinimumDurationInput(null)}
              onChange={(event) => {
                setMinimumDurationInput(event.currentTarget.value);
                if (event.currentTarget.value !== "")
                  setMinimumDuration(event.currentTarget.valueAsNumber);
              }}
            />
            <span className="text-muted-foreground text-xs">seconds</span>
          </div>
          <p
            id="history-duration-help"
            className="text-muted-foreground text-xs"
          >
            {MIN_HISTORY_MINIMUM_DURATION_SECONDS}–
            {MAX_HISTORY_MINIMUM_DURATION_SECONDS} seconds; default 30.
          </p>
        </Field>
      </div>
    </PreferenceCard>
  );
}

export function StorageStatusSection() {
  const mode = useStorageStore((state) => state.mode);
  const warning = useStorageStore((state) => state.warning);
  return (
    <PreferenceCard
      id="storage-status-heading"
      icon={<Database aria-hidden="true" className="size-4" />}
      eyebrow="Storage status"
      title={
        mode === "indexed-db" ? "Saved on this device" : "Visit-only storage"
      }
    >
      <p className="text-muted-foreground text-sm leading-6">
        {mode === "indexed-db"
          ? "Patterns, presets, favorites, and journal entries stay in this browser. Nothing is uploaded to a server."
          : (warning ??
            "Browser database storage is unavailable, so new data lasts only for this visit.")}
      </p>
    </PreferenceCard>
  );
}
