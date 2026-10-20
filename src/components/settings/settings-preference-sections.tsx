"use client";

import {
  Database,
  History,
  Music2,
  Palette,
  SlidersHorizontal,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
  title,
  description,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card
      as="section"
      aria-labelledby={id}
      className="border-border min-w-0 gap-5 rounded-2xl border py-5 ring-0"
    >
      <CardHeader className="gap-1.5 px-4 sm:px-5">
        <h2
          className="flex items-center gap-2 text-base font-extrabold"
          id={id}
        >
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        <p className="text-muted-foreground text-sm leading-5">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-5">{children}</CardContent>
    </Card>
  );
}

function Choice<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  description,
}: {
  id: string;
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <Field className="gap-2">
      <FieldLabel id={`${id}-label`} htmlFor={id}>
        {label}
      </FieldLabel>
      <Select
        disabled={disabled}
        items={options.map(([value, label]) => ({ value, label }))}
        value={value}
        onValueChange={(value) => {
          const option = options.find(([candidate]) => candidate === value);
          if (option) onChange(option[0]);
        }}
      >
        <SelectTrigger
          id={id}
          aria-describedby={description ? `${id}-help` : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent listProps={{ "aria-labelledby": `${id}-label` }}>
          {options.map(([option, text]) => (
            <SelectItem key={option} value={option}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? (
        <p
          id={`${id}-help`}
          className="text-muted-foreground text-xs leading-5"
        >
          {description}
        </p>
      ) : null}
    </Field>
  );
}

function PreferenceSwitch({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer touch-manipulation items-center justify-between gap-4 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50">
      <span className="min-w-0 space-y-1">
        <span id={`${id}-label`} className="block text-sm font-semibold">
          {label}
        </span>
        <span
          id={`${id}-help`}
          className="text-muted-foreground block text-xs leading-5"
        >
          {description}
        </span>
      </span>
      <Switch
        id={id}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-help`}
        className="transition-colors after:-inset-y-3.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </label>
  );
}

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
      title="Appearance"
      description="Customize how Web Band looks and feels."
    >
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
      <PreferenceSwitch
        id="reduce-motion"
        label="Reduce motion"
        description="Minimize animations throughout the interface."
        checked={reducedMotion}
        disabled={!hydrated}
        onChange={setReducedMotion}
      />
      <Choice<VisualSubdivisionDetail>
        id="visual-detail"
        label="Visual subdivision detail"
        description="Choose how much rhythmic detail appears in the visualizer."
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
    </PreferenceCard>
  );
}

export function PracticeDefaultsSettingsSection() {
  const hydrated = usePracticeStore((state) => state.hasHydrated);
  const bpmAdjustmentStep = usePracticeStore(
    (state) => state.bpmAdjustmentStep,
  );
  const countInMeasures = usePracticeStore((state) => state.countInMeasures);
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
      title="Practice"
      description="Choose how your sessions begin."
    >
      <Choice<CountInMeasures>
        id="default-count-in"
        label="Default count-in"
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
        label="BPM adjustment"
        value={bpmAdjustmentStep}
        disabled={!hydrated}
        onChange={setBpmAdjustmentStep}
        options={[
          [1, "1 BPM"],
          [5, "5 BPM"],
        ]}
      />
      <PreferenceSwitch
        id="wake-lock"
        label="Keep screen awake while playing"
        description="Prevent sleep during playback on supported devices."
        checked={wakeLockEnabled}
        disabled={!hydrated}
        onChange={setWakeLockEnabled}
      />
      <PreferenceSwitch
        id="restore-last-practice"
        label="Restore last practice setup"
        description="Continue with your previous practice configuration."
        checked={restoreLastPractice}
        disabled={!hydrated}
        onChange={setRestoreLastPractice}
      />
    </PreferenceCard>
  );
}

export function SoundSettingsSection() {
  const hydrated = usePracticeStore((state) => state.hasHydrated);
  const masterVolume = usePracticeStore((state) => state.masterVolume);
  const setMasterVolume = usePracticeStore((state) => state.setMasterVolume);
  const soundCharacter = usePracticeStore((state) => state.soundCharacter);
  const setSoundCharacter = usePracticeStore(
    (state) => state.setSoundCharacter,
  );
  return (
    <PreferenceCard
      id="sound-settings-heading"
      icon={<Music2 aria-hidden="true" className="size-4" />}
      title="Audio"
      description="Adjust your practice sound."
    >
      <Field className="gap-0">
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
      <Choice<SoundCharacter>
        id="sound-character"
        label="Drum sound character"
        description="Shapes the synthesized drums in practice and previews."
        value={soundCharacter}
        disabled={!hydrated}
        onChange={setSoundCharacter}
        options={[
          ["soft", "Soft"],
          ["balanced", "Balanced"],
          ["punchy", "Punchy"],
        ]}
      />
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
    <PreferenceCard
      id="history-settings-heading"
      icon={<History aria-hidden="true" className="size-4" />}
      title="Practice history"
      description="Control how completed sessions are recorded."
    >
      <PreferenceSwitch
        id="save-practice-history"
        label="Save practice history"
        description="Turning this off keeps your existing history."
        checked={enabled}
        disabled={!hydrated}
        onChange={setEnabled}
      />
      <Field data-disabled={!hydrated || !enabled}>
        <FieldLabel htmlFor="history-minimum-duration">
          Minimum session duration
        </FieldLabel>
        <div className="flex items-center gap-3">
          <Input
            id="history-minimum-duration"
            className="min-h-11 w-24"
            aria-describedby="history-duration-help"
            type="number"
            name="minimum-session-duration"
            autoComplete="off"
            min={MIN_HISTORY_MINIMUM_DURATION_SECONDS}
            max={MAX_HISTORY_MINIMUM_DURATION_SECONDS}
            step={1}
            disabled={!hydrated || !enabled}
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
        <p id="history-duration-help" className="text-muted-foreground text-xs">
          Sessions shorter than this duration are not saved. Range:{" "}
          {MIN_HISTORY_MINIMUM_DURATION_SECONDS}–
          {MAX_HISTORY_MINIMUM_DURATION_SECONDS} seconds; default 30.
        </p>
      </Field>
    </PreferenceCard>
  );
}

export function StorageStatusSection() {
  const mode = useStorageStore((state) => state.mode);
  const warning = useStorageStore((state) => state.warning);
  return (
    <div className="flex items-start gap-3">
      <Database
        aria-hidden="true"
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
      />
      <div className="space-y-1">
        <h3 className="text-sm font-bold">
          {mode === "indexed-db" ? "Stored locally" : "Visit-only storage"}
        </h3>
        <p className="text-muted-foreground max-w-2xl text-sm leading-5">
          {mode === "indexed-db"
            ? "Your patterns, presets, favorites, and practice history are saved in this browser. Nothing is uploaded. Browser storage can be cleared or become unavailable."
            : (warning ??
              "Browser database storage is unavailable, so new data lasts only for this visit.")}
        </p>
      </div>
    </div>
  );
}
