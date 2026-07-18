import type { AudioRuntime } from "@/audio/audio-runtime";
import { shouldFillMeasure } from "@/audio/fill-generator";
import {
  GuidedPracticeController,
  type GuidedPracticeTick,
} from "@/audio/guided-practice-controller";
import {
  guidanceTimeline,
  type GuidanceTimeline,
} from "@/audio/guidance-timeline";
import {
  getPlayablePatternStep,
  humanizeHit,
} from "@/audio/pattern-scheduler-helpers";
import type { VisualTimeline } from "@/audio/visual-timeline";
import { getStepsPerBar, getSubdivisionNotation } from "@/lib/musical-time";
import { clampUnit } from "@/lib/mixer";
import { validatePattern } from "@/lib/pattern-validation";
import { isStrummingPatternMeterCompatible } from "@/lib/guided-practice";
import type { CountInMeasures, FillFrequency } from "@/types/audio";
import type { DrumPattern } from "@/types/pattern";
import type { GuidedPracticeConfiguration } from "@/types/practice";

export interface PatternSchedulerOptions {
  bpm: number;
  countInMeasures: CountInMeasures;
  fillFrequency: FillFrequency;
  guidedPractice: GuidedPracticeConfiguration;
  humanization: number;
  onPatternStarted: () => void;
  onTargetStop?: () => void;
  swing: number;
}

interface PendingPattern {
  onPatternChanged: (pattern: DrumPattern) => void;
  pattern: DrumPattern;
}

type TargetStopState = "delivered" | "idle" | "pending";

export interface PatternInstrumentPlayer {
  trigger: (
    instrument: DrumPattern["hits"][number]["instrument"],
    time: number,
    velocity: number,
  ) => void;
  triggerCountIn: (time: number, isDownbeat: boolean) => void;
}

export class PatternScheduler {
  private patternAbsoluteSixteenth = 0;
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
  private targetStopState: TargetStopState = "idle";

  constructor(
    private readonly runtime: AudioRuntime,
    private readonly instruments: PatternInstrumentPlayer,
    private readonly timeline: VisualTimeline,
    private readonly random: () => number = Math.random,
    private readonly guidedTimeline: GuidanceTimeline = guidanceTimeline,
    private readonly guidedController = new GuidedPracticeController(),
  ) {}

  schedule(pattern: DrumPattern, options: PatternSchedulerOptions): void {
    this.assertValidPattern(pattern);
    this.assertGuidedPatternCompatible(pattern, options.guidedPractice);

    this.clear();
    this.guidedController.begin(
      options.guidedPractice,
      pattern.timeSignature,
      options.bpm,
    );
    this.guidedTimeline.begin();
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

  setBpm(bpm: number): void {
    this.guidedController.setBpm(bpm);
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
  ): boolean {
    this.assertValidPattern(pattern);
    if (
      !this.guidedController.isTimeSignatureCompatible(pattern.timeSignature)
    ) {
      return false;
    }
    if (
      immediate &&
      this.activePattern &&
      (this.activePattern.timeSignature.numerator !==
        pattern.timeSignature.numerator ||
        this.activePattern.timeSignature.denominator !==
          pattern.timeSignature.denominator)
    ) {
      return false;
    }

    if (immediate || !this.activePattern) {
      this.applyPattern(pattern);
      onPatternChanged(pattern);
      return true;
    }

    this.pendingPattern = { onPatternChanged, pattern };
    return true;
  }

  clear(): void {
    this.scheduleGeneration += 1;
    this.drawGeneration += 1;
    for (const scheduleId of this.scheduleIds) {
      this.runtime.clearSchedule(scheduleId);
    }
    this.scheduleIds.clear();
    this.runtime.cancelDraw();
    this.patternAbsoluteSixteenth = 0;
    this.activePattern = null;
    this.hasStarted = false;
    this.isCurrentMeasureFill = false;
    this.pendingPattern = null;
    this.previousMeasureWasFill = false;
    this.targetStopState = "idle";
    this.guidedController.reset();
    this.guidedTimeline.reset();
  }

  cancelPendingVisuals(): void {
    this.drawGeneration += 1;
    this.runtime.cancelDraw();
    if (this.targetStopState === "pending") {
      this.targetStopState = "idle";
      this.guidedController.rearmTargetStop();
    }
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
        if (this.targetStopState !== "idle") return;
        const patternBeforeBoundary = this.activePattern ?? initialPattern;
        const measureLength = getStepsPerBar(
          patternBeforeBoundary.timeSignature,
          16,
        );
        const isMeasureBoundary =
          this.patternAbsoluteSixteenth === 0 ||
          this.patternAbsoluteSixteenth % measureLength === 0;
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
        const currentAbsoluteSixteenthStep = this.patternAbsoluteSixteenth;
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
        const guidanceTick = this.guidedController.tick();
        this.scheduleGuidance(
          guidanceTick,
          time,
          generation,
          options.onTargetStop,
        );
        if (guidanceTick.shouldStop) return;
        const playableStep = getPlayablePatternStep(
          pattern,
          this.patternAbsoluteSixteenth,
          this.isCurrentMeasureFill,
          addPostFillCrash,
        );
        if (!playableStep) {
          this.patternAbsoluteSixteenth += 1;
          return;
        }

        for (const hit of playableStep.hits) {
          const shouldPlay =
            hit.probability === undefined || this.random() <= hit.probability;
          if (shouldPlay) {
            const humanized = humanizeHit(
              hit,
              playableStep.stepInBar === 0,
              this.humanization,
              this.random,
            );
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
            isAccent: playableStep.hits.some((hit) => hit.velocity >= 0.8),
            measure:
              Math.floor(
                currentAbsoluteSixteenthStep /
                  getStepsPerBar(pattern.timeSignature, 16),
              ) + 1,
            phase: "pattern",
            step: playableStep.stepInBar,
          });
        }, time);

        this.patternAbsoluteSixteenth += 1;
      },
      "16n",
      options.countInMeasures === 0 ? 0 : `${options.countInMeasures}m`,
    );

    this.scheduleIds.add(scheduleId);
  }

  private applyPattern(pattern: DrumPattern): void {
    this.activePattern = pattern;
    this.patternAbsoluteSixteenth = 0;
    this.guidedController.setTimeSignature(pattern.timeSignature);
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

  private scheduleGuidance(
    tick: GuidedPracticeTick,
    time: number,
    generation: number,
    onTargetStop?: () => void,
  ): void {
    if (tick.bpmChange !== null) {
      this.runtime.setBpmAtTime(tick.bpmChange, time);
    }
    if (tick.shouldStop) this.targetStopState = "pending";
    const drawGeneration = this.drawGeneration;
    this.runtime.scheduleDraw(() => {
      if (!this.isDrawCurrent(generation, drawGeneration)) return;
      this.guidedTimeline.publish(tick.frame);
      if (tick.shouldStop) {
        this.targetStopState = "delivered";
        onTargetStop?.();
      }
    }, time);
  }

  private assertValidPattern(pattern: DrumPattern): void {
    const validation = validatePattern(pattern);
    if (!validation.success) {
      throw new Error(`Pattern is invalid: ${validation.errors.join(" ")}`);
    }
  }

  private assertGuidedPatternCompatible(
    pattern: DrumPattern,
    configuration: GuidedPracticeConfiguration,
  ): void {
    if (
      configuration.mode === "strumming" &&
      !isStrummingPatternMeterCompatible(
        configuration.strummingPattern,
        pattern.timeSignature,
      )
    ) {
      throw new Error(
        "The drum pattern time signature must match the strumming pattern.",
      );
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
