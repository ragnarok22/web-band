import type { AudioRuntime } from "@/audio/audio-runtime";
import { getGenericFillHits, shouldFillMeasure } from "@/audio/fill-generator";
import type { VisualTimeline } from "@/audio/visual-timeline";
import {
  getPatternStepCount,
  getStepsPerBar,
  getSubdivisionNotation,
} from "@/lib/musical-time";
import { clampUnit } from "@/lib/mixer";
import { validatePattern } from "@/lib/pattern-validation";
import type { CountInMeasures, FillFrequency } from "@/types/audio";
import type { DrumInstrument } from "@/types/pattern";
import type { DrumPattern } from "@/types/pattern";

interface PatternSchedulerOptions {
  countInMeasures: CountInMeasures;
  fillFrequency: FillFrequency;
  humanization: number;
  onPatternStarted: () => void;
  swing: number;
}

interface PendingPattern {
  onPatternChanged: (pattern: DrumPattern) => void;
  pattern: DrumPattern;
}

interface PlayableHit {
  instrument: DrumInstrument;
  probability?: number;
  timingOffset?: number;
  velocity: number;
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
  private drawGeneration = 0;
  private fillFrequency: FillFrequency = null;
  private hasStarted = false;
  private humanization = 0;
  private isCurrentMeasureFill = false;
  private pendingPattern: PendingPattern | null = null;
  private previousMeasureWasFill = false;
  private scheduleGeneration = 0;
  private readonly scheduleIds = new Set<number>();
  private swing = 0;

  constructor(
    private readonly runtime: AudioRuntime,
    private readonly instruments: PatternInstrumentPlayer,
    private readonly timeline: VisualTimeline,
    private readonly random: () => number = Math.random,
  ) {}

  schedule(pattern: DrumPattern, options: PatternSchedulerOptions): void {
    this.assertValidPattern(pattern);

    this.clear();
    this.activePattern = pattern;
    this.fillFrequency = options.fillFrequency;
    this.humanization = clampUnit(options.humanization);
    this.swing = Math.min(0.65, Math.max(0, options.swing));
    this.runtime.setTimeSignature(
      pattern.timeSignature.numerator,
      pattern.timeSignature.denominator,
    );
    this.runtime.setSwing(
      this.swing,
      getSubdivisionNotation(pattern.subdivision),
    );
    const generation = this.scheduleGeneration;
    this.scheduleCountIn(pattern, options.countInMeasures, generation);
    this.schedulePattern(pattern, options, generation);
  }

  setFillFrequency(frequency: FillFrequency): void {
    this.fillFrequency = frequency;
  }

  setHumanization(amount: number): void {
    this.humanization = clampUnit(amount);
  }

  setSwing(amount: number): void {
    this.swing = Math.min(0.65, Math.max(0, amount));
    if (this.activePattern) {
      this.runtime.setSwing(
        this.swing,
        getSubdivisionNotation(this.activePattern.subdivision),
      );
    }
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
    this.scheduleGeneration += 1;
    this.drawGeneration += 1;
    for (const scheduleId of this.scheduleIds) {
      this.runtime.clearSchedule(scheduleId);
    }
    this.scheduleIds.clear();
    this.runtime.cancelDraw();
    this.absoluteSixteenthStep = 0;
    this.activePattern = null;
    this.hasStarted = false;
    this.isCurrentMeasureFill = false;
    this.pendingPattern = null;
    this.previousMeasureWasFill = false;
  }

  cancelPendingVisuals(): void {
    this.drawGeneration += 1;
    this.runtime.cancelDraw();
  }

  private scheduleCountIn(
    pattern: DrumPattern,
    countInMeasures: CountInMeasures,
    generation: number,
  ): void {
    if (countInMeasures === 0) return;

    let beatIndex = 0;
    const beatCount = pattern.timeSignature.numerator;
    const beatNotation = `${pattern.timeSignature.denominator}n`;

    const scheduleId = this.runtime.scheduleRepeat(
      (time) => {
        if (!this.isScheduleCurrent(generation)) return;
        const currentBeat = beatIndex % beatCount;
        const currentMeasure = Math.floor(beatIndex / beatCount) + 1;
        this.instruments.triggerCountIn(time, currentBeat === 0);
        const drawGeneration = this.drawGeneration;
        this.runtime.scheduleDraw(() => {
          if (!this.isDrawCurrent(generation, drawGeneration)) return;
          this.timeline.emit({
            isAccent: currentBeat === 0,
            measure: currentMeasure,
            phase: "count-in",
            step: currentBeat,
          });
        }, time);
        beatIndex += 1;
      },
      beatNotation,
      0,
      `${countInMeasures}m`,
    );

    this.scheduleIds.add(scheduleId);
  }

  private schedulePattern(
    initialPattern: DrumPattern,
    options: PatternSchedulerOptions,
    generation: number,
  ): void {
    const scheduleId = this.runtime.scheduleRepeat(
      (time) => {
        if (!this.isScheduleCurrent(generation)) return;
        const patternBeforeBoundary = this.activePattern ?? initialPattern;
        const measureLength = getStepsPerBar(
          patternBeforeBoundary.timeSignature,
          16,
        );
        const isMeasureBoundary =
          this.absoluteSixteenthStep === 0 ||
          this.absoluteSixteenthStep % measureLength === 0;
        const addPostFillCrash = isMeasureBoundary && this.isCurrentMeasureFill;

        if (isMeasureBoundary && this.pendingPattern) {
          const pending = this.pendingPattern;
          this.applyPattern(pending.pattern);
          this.pendingPattern = null;
          const drawGeneration = this.drawGeneration;
          this.runtime.scheduleDraw(() => {
            if (!this.isDrawCurrent(generation, drawGeneration)) return;
            pending.onPatternChanged(pending.pattern);
          }, time);
        }

        const pattern = this.activePattern ?? initialPattern;
        const currentAbsoluteSixteenthStep = this.absoluteSixteenthStep;
        const sixteenthsPerBar = getStepsPerBar(pattern.timeSignature, 16);
        const measure =
          Math.floor(currentAbsoluteSixteenthStep / sixteenthsPerBar) + 1;
        if (isMeasureBoundary) {
          this.previousMeasureWasFill = this.isCurrentMeasureFill;
          this.isCurrentMeasureFill = shouldFillMeasure(
            this.fillFrequency,
            measure,
            this.previousMeasureWasFill,
            this.random,
          );
        }
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
        const patternHits: PlayableHit[] = pattern.hits.filter(
          (hit) => hit.step === patternStep,
        );
        const fillHits = this.isCurrentMeasureFill
          ? getGenericFillHits(pattern, stepInBar)
          : [];
        const hits: PlayableHit[] =
          fillHits.length > 0 ? [...fillHits] : [...patternHits];

        if (
          addPostFillCrash &&
          !hits.some((hit) => hit.instrument === "crash")
        ) {
          hits.push({ instrument: "crash", velocity: 0.9 });
        }

        for (const hit of hits) {
          const shouldPlay =
            hit.probability === undefined || this.random() <= hit.probability;
          if (shouldPlay) {
            const humanized = this.humanizeHit(hit, stepInBar === 0);
            this.instruments.trigger(
              hit.instrument,
              time + (hit.timingOffset ?? 0) + humanized.timeOffset,
              humanized.velocity,
            );
          }
        }

        const drawGeneration = this.drawGeneration;
        this.runtime.scheduleDraw(() => {
          if (!this.isDrawCurrent(generation, drawGeneration)) return;
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
      options.countInMeasures === 0 ? 0 : `${options.countInMeasures}m`,
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
    this.runtime.setSwing(
      this.swing,
      getSubdivisionNotation(pattern.subdivision),
    );
    this.isCurrentMeasureFill = false;
    this.previousMeasureWasFill = false;
  }

  private humanizeHit(
    hit: PlayableHit,
    isDownbeat: boolean,
  ): { timeOffset: number; velocity: number } {
    if (this.humanization === 0) {
      return { timeOffset: 0, velocity: hit.velocity };
    }

    const timeOffset = isDownbeat
      ? 0
      : this.random() * 0.01 * this.humanization;
    const velocityOffset = (this.random() * 2 - 1) * 0.05 * this.humanization;
    return {
      timeOffset,
      velocity: clampUnit(hit.velocity + velocityOffset),
    };
  }

  private assertValidPattern(pattern: DrumPattern): void {
    const validation = validatePattern(pattern);
    if (!validation.success) {
      throw new Error(`Pattern is invalid: ${validation.errors.join(" ")}`);
    }
  }

  private isScheduleCurrent(generation: number): boolean {
    return generation === this.scheduleGeneration;
  }

  private isDrawCurrent(
    scheduleGeneration: number,
    drawGeneration: number,
  ): boolean {
    return (
      this.isScheduleCurrent(scheduleGeneration) &&
      drawGeneration === this.drawGeneration
    );
  }
}
