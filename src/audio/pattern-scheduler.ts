import type { AudioRuntime } from "@/audio/audio-runtime";
import type { VisualTimeline } from "@/audio/visual-timeline";
import { getPatternStepCount, getStepsPerBar } from "@/lib/musical-time";
import { validatePattern } from "@/lib/pattern-validation";
import type { DrumPattern } from "@/types/pattern";

interface PatternSchedulerOptions {
  onPatternStarted: () => void;
}

interface PendingPattern {
  onPatternChanged: (pattern: DrumPattern) => void;
  pattern: DrumPattern;
}

export interface PatternInstrumentPlayer {
  trigger: (
    instrument: DrumPattern["hits"][number]["instrument"],
    time: number,
    velocity: number,
  ) => void;
  triggerCountIn: (time: number, isDownbeat: boolean) => void;
}

export class PatternScheduler {
  private absoluteSixteenthStep = 0;
  private activePattern: DrumPattern | null = null;
  private hasStarted = false;
  private pendingPattern: PendingPattern | null = null;
  private readonly scheduleIds = new Set<number>();

  constructor(
    private readonly runtime: AudioRuntime,
    private readonly instruments: PatternInstrumentPlayer,
    private readonly timeline: VisualTimeline,
  ) {}

  schedule(pattern: DrumPattern, options: PatternSchedulerOptions): void {
    this.assertValidPattern(pattern);

    this.clear();
    this.activePattern = pattern;
    this.runtime.setTimeSignature(
      pattern.timeSignature.numerator,
      pattern.timeSignature.denominator,
    );
    this.scheduleCountIn(pattern);
    this.schedulePattern(pattern, options);
  }

  changePattern(
    pattern: DrumPattern,
    onPatternChanged: (pattern: DrumPattern) => void,
    immediate = false,
  ): void {
    this.assertValidPattern(pattern);

    if (immediate || !this.activePattern) {
      this.applyPattern(pattern);
      onPatternChanged(pattern);
      return;
    }

    this.pendingPattern = { onPatternChanged, pattern };
  }

  clear(): void {
    for (const scheduleId of this.scheduleIds) {
      this.runtime.clearSchedule(scheduleId);
    }
    this.scheduleIds.clear();
    this.runtime.cancelDraw();
    this.absoluteSixteenthStep = 0;
    this.activePattern = null;
    this.hasStarted = false;
    this.pendingPattern = null;
  }

  private scheduleCountIn(pattern: DrumPattern): void {
    let beatIndex = 0;
    const beatCount = pattern.timeSignature.numerator;
    const beatNotation = `${pattern.timeSignature.denominator}n`;

    const scheduleId = this.runtime.scheduleRepeat(
      (time) => {
        const currentBeat = beatIndex % beatCount;
        this.instruments.triggerCountIn(time, currentBeat === 0);
        this.runtime.scheduleDraw(() => {
          this.timeline.emit({
            isAccent: currentBeat === 0,
            measure: 0,
            phase: "count-in",
            step: currentBeat,
          });
        }, time);
        beatIndex += 1;
      },
      beatNotation,
      0,
      "1m",
    );

    this.scheduleIds.add(scheduleId);
  }

  private schedulePattern(
    initialPattern: DrumPattern,
    options: PatternSchedulerOptions,
  ): void {
    const scheduleId = this.runtime.scheduleRepeat(
      (time) => {
        const patternBeforeBoundary = this.activePattern ?? initialPattern;
        const measureLength = getStepsPerBar(
          patternBeforeBoundary.timeSignature,
          16,
        );
        const isMeasureBoundary =
          this.absoluteSixteenthStep === 0 ||
          this.absoluteSixteenthStep % measureLength === 0;

        if (isMeasureBoundary && this.pendingPattern) {
          const pending = this.pendingPattern;
          this.applyPattern(pending.pattern);
          this.pendingPattern = null;
          this.runtime.scheduleDraw(
            () => pending.onPatternChanged(pending.pattern),
            time,
          );
        }

        const pattern = this.activePattern ?? initialPattern;
        const currentAbsoluteSixteenthStep = this.absoluteSixteenthStep;
        const sixteenthsPerStep = 16 / pattern.subdivision;
        const patternLength = getPatternStepCount(pattern) * sixteenthsPerStep;
        const patternSixteenthStep = this.absoluteSixteenthStep % patternLength;

        if (patternSixteenthStep % sixteenthsPerStep !== 0) {
          this.absoluteSixteenthStep += 1;
          return;
        }

        const patternStep = patternSixteenthStep / sixteenthsPerStep;
        const stepsPerBar = getStepsPerBar(
          pattern.timeSignature,
          pattern.subdivision,
        );
        const stepInBar = patternStep % stepsPerBar;
        const hits = pattern.hits.filter((hit) => hit.step === patternStep);

        for (const hit of hits) {
          const shouldPlay =
            hit.probability === undefined || Math.random() <= hit.probability;
          if (shouldPlay) {
            this.instruments.trigger(
              hit.instrument,
              time + (hit.timingOffset ?? 0),
              hit.velocity,
            );
          }
        }

        this.runtime.scheduleDraw(() => {
          if (!this.hasStarted) {
            this.hasStarted = true;
            options.onPatternStarted();
          }
          this.timeline.emit({
            isAccent: hits.some((hit) => hit.velocity >= 0.8),
            measure:
              Math.floor(
                currentAbsoluteSixteenthStep /
                  getStepsPerBar(pattern.timeSignature, 16),
              ) + 1,
            phase: "pattern",
            step: stepInBar,
          });
        }, time);

        this.absoluteSixteenthStep += 1;
      },
      "16n",
      "1m",
    );

    this.scheduleIds.add(scheduleId);
  }

  private applyPattern(pattern: DrumPattern): void {
    this.activePattern = pattern;
    this.absoluteSixteenthStep = 0;
    this.runtime.setTimeSignature(
      pattern.timeSignature.numerator,
      pattern.timeSignature.denominator,
    );
  }

  private assertValidPattern(pattern: DrumPattern): void {
    const validation = validatePattern(pattern);
    if (!validation.success) {
      throw new Error(`Pattern is invalid: ${validation.errors.join(" ")}`);
    }
  }
}
