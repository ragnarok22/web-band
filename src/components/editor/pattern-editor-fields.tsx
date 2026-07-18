"use client";

import {
  resizePatternDraft,
  supportedTimeSignatures,
} from "@/lib/drum-pattern-editor";
import type { CustomDrumPattern } from "@/types/persistence";
import type { PatternCategory, PatternDifficulty } from "@/types/pattern";

interface PatternEditorFieldsProps {
  disabled?: boolean;
  onChange: (pattern: CustomDrumPattern) => void;
  pattern: CustomDrumPattern;
}

const categories: PatternCategory[] = [
  "rock",
  "pop",
  "blues",
  "funk",
  "reggae",
  "country",
  "ballad",
  "latin",
  "metal",
  "jazz",
  "custom",
];
const difficulties: PatternDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];
const inputClass =
  "border-border bg-background text-foreground focus:border-accent min-h-11 w-full rounded-xl border px-3 text-sm font-bold outline-none disabled:opacity-50";

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function PatternEditorFields({
  disabled = false,
  onChange,
  pattern,
}: PatternEditorFieldsProps) {
  function update(changes: Partial<CustomDrumPattern>): void {
    onChange({ ...pattern, ...changes });
  }

  return (
    <fieldset
      className="border-border bg-surface grid gap-4 rounded-2xl border p-4 sm:p-5"
      disabled={disabled}
    >
      <legend className="sr-only">Pattern details</legend>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <label className="text-muted-strong text-xs font-extrabold tracking-wide uppercase">
          Pattern name
          <input
            className={`${inputClass} mt-1.5 text-base`}
            maxLength={100}
            name="pattern-name"
            onChange={(event) => update({ name: event.target.value })}
            required
            type="text"
            value={pattern.name}
          />
        </label>
        <label className="text-muted-strong text-xs font-extrabold tracking-wide uppercase">
          Genre / category
          <select
            className={`${inputClass} mt-1.5`}
            name="pattern-category"
            onChange={(event) =>
              update({ category: event.target.value as PatternCategory })
            }
            value={pattern.category}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "custom" ? "Utility" : titleCase(category)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-muted-strong text-xs font-extrabold tracking-wide uppercase">
        Description
        <textarea
          className={`${inputClass} mt-1.5 min-h-24 resize-y py-3 leading-6`}
          maxLength={1000}
          name="pattern-description"
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Describe the feel, accents, or practice goal."
          value={pattern.description}
        />
      </label>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SelectField
          label="Difficulty"
          name="pattern-difficulty"
          onChange={(value) =>
            update({ difficulty: value as PatternDifficulty })
          }
          options={difficulties.map((value) => ({
            label: titleCase(value),
            value,
          }))}
          value={pattern.difficulty}
        />
        <SelectField
          label="Meter"
          name="pattern-meter"
          onChange={(value) => {
            const timeSignature = supportedTimeSignatures.find(
              ({ denominator, numerator }) =>
                `${numerator}/${denominator}` === value,
            );
            if (timeSignature) {
              onChange(resizePatternDraft(pattern, { timeSignature }));
            }
          }}
          options={supportedTimeSignatures.map(
            ({ denominator, numerator }) => ({
              label: `${numerator}/${denominator}`,
              value: `${numerator}/${denominator}`,
            }),
          )}
          value={`${pattern.timeSignature.numerator}/${pattern.timeSignature.denominator}`}
        />
        <SelectField
          label="Bars"
          name="pattern-bars"
          onChange={(value) =>
            onChange(
              resizePatternDraft(pattern, {
                bars: Number(value) as 1 | 2 | 4,
              }),
            )
          }
          options={[1, 2, 4].map((value) => ({
            label: `${value} ${value === 1 ? "bar" : "bars"}`,
            value: String(value),
          }))}
          value={String(pattern.bars)}
        />
        <SelectField
          label="Subdivision"
          name="pattern-subdivision"
          onChange={(value) =>
            onChange(
              resizePatternDraft(pattern, {
                subdivision: Number(value) as 8 | 16,
              }),
            )
          }
          options={[
            { label: "Eighth notes", value: "8" },
            { label: "Sixteenth notes", value: "16" },
          ]}
          value={String(pattern.subdivision)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField
          label="Default BPM"
          name="pattern-default-bpm"
          onChange={(defaultBpm) => update({ defaultBpm })}
          value={pattern.defaultBpm}
        />
        <NumberField
          label="Recommended min"
          name="pattern-recommended-min"
          onChange={(min) =>
            update({
              recommendedBpmRange: { ...pattern.recommendedBpmRange, min },
            })
          }
          value={pattern.recommendedBpmRange.min}
        />
        <NumberField
          label="Recommended max"
          name="pattern-recommended-max"
          onChange={(max) =>
            update({
              recommendedBpmRange: { ...pattern.recommendedBpmRange, max },
            })
          }
          value={pattern.recommendedBpmRange.max}
        />
      </div>
    </fieldset>
  );
}

interface SelectFieldProps {
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}

function SelectField({
  label,
  name,
  onChange,
  options,
  value,
}: SelectFieldProps) {
  return (
    <label className="text-muted-strong text-xs font-extrabold tracking-wide uppercase">
      {label}
      <select
        className={`${inputClass} mt-1.5`}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="text-muted-strong text-xs font-extrabold tracking-wide uppercase">
      {label}
      <input
        className={`${inputClass} mt-1.5 tabular-nums`}
        max={220}
        min={40}
        name={name}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        required
        type="number"
        value={value}
      />
    </label>
  );
}
