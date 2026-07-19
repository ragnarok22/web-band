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
import type {
  CountInMeasures,
  FillFrequency,
  ScheduledVisualStep,
} from "@/types/audio";
import type { DrumPattern } from "@/types/pattern";
import type { GuidedPracticeConfiguration } from "@/types/practice";

const FLAM_DELAY_SECONDS = 0.03;
const FLAM_VELOCITY_SCALE = 0.7;

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

interface PlannedHit {
  instrument: DrumPattern["hits"][number]["instrument"];
  timeOffset: number;
  velocity: number;
}

interface PlannedPatternTick {
  guidance: GuidedPracticeTick;
  hits: PlannedHit[];
  patternChange: PendingPattern | null;
  semanticCallbackId: number | null;
  visual: ScheduledVisualStep | null;
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
  private callbackGeneration = 0;
  private readonly callbackIds = new Set<number>();
  private drawGeneration = 0;
  private fillFrequency: FillFrequency = null;
  private hasStarted = false;
  private humanization = 0;
  private isCurrentMeasureFill = false;
  private pendingPattern: PendingPattern | null = null;
  private readonly plannedTicks = new Map<number, PlannedPatternTick>();
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
    this.cancelPendingCallbacks();
    for (const scheduleId of this.scheduleIds) {
      this.runtime.clearSchedule(scheduleId);
    }
    this.scheduleIds.clear();
    this.runtime.cancelDraw();
    this.plannedTicks.clear();
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
    this.cancelPendingCallbacks();
    if (this.targetStopState === "pending") {
      this.targetStopState = "idle";
    }
  }

  private scheduleCountIn(
    pattern: DrumPattern,
    countInMeasures: CountInMeasures,
    generation: number,
  ): void {
    if (countInMeasures === 0) return;

    const beatCount = pattern.timeSignature.numerator;
    const beatNotation = `${pattern.timeSignature.denominator}n`;
    const sixteenthsPerBeat = 16 / pattern.timeSignature.denominator;

    const scheduleId = this.runtime.scheduleRepeat(
      (time, transportSixteenth) => {
        if (!this.isScheduleCurrent(generation)) return;
        const beatIndex = Math.round(transportSixteenth / sixteenthsPerBeat);
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
      (time, transportSixteenth) => {
        if (!this.isScheduleCurrent(generation)) return;
        if (this.targetStopState !== "idle") return;
        const plan =
          this.plannedTicks.get(transportSixteenth) ??
          this.planPatternTick(initialPattern, transportSixteenth);
        this.playPatternTick(
          plan,
          transportSixteenth,
          time,
          generation,
          options,
        );
      },
      "16n",
      options.countInMeasures === 0 ? 0 : `${options.countInMeasures}m`,
    );

    this.scheduleIds.add(scheduleId);
  }

  private planPatternTick(
    initialPattern: DrumPattern,
    transportSixteenth: number,
  ): PlannedPatternTick {
    const patternBeforeBoundary = this.activePattern ?? initialPattern;
    const measureLength = getStepsPerBar(
      patternBeforeBoundary.timeSignature,
      16,
    );
    const isMeasureBoundary =
      this.patternAbsoluteSixteenth === 0 ||
      this.patternAbsoluteSixteenth % measureLength === 0;
    const addPostFillCrash = isMeasureBoundary && this.isCurrentMeasureFill;
    let patternChange: PendingPattern | null = null;

    if (isMeasureBoundary && this.pendingPattern) {
      patternChange = this.pendingPattern;
      this.applyPattern(patternChange.pattern);
      this.pendingPattern = null;
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

    const guidance = this.guidedController.tick();
    const hits: PlannedHit[] = [];
    let visual: ScheduledVisualStep | null = null;
    if (!guidance.shouldStop) {
      const playableStep = getPlayablePatternStep(
        pattern,
        this.patternAbsoluteSixteenth,
        this.isCurrentMeasureFill,
        addPostFillCrash,
      );
      this.patternAbsoluteSixteenth += 1;

      if (playableStep) {
        for (const hit of playableStep.hits) {
          const shouldPlay =
            hit.probability === undefined || this.random() < hit.probability;
          if (!shouldPlay) continue;

          const humanized = humanizeHit(
            hit,
            playableStep.stepInBar === 0,
            this.humanization,
            this.random,
          );
          const timeOffset = (hit.timingOffset ?? 0) + humanized.timeOffset;
          const velocity = hit.flam
            ? Math.max(Number.EPSILON, humanized.velocity)
            : humanized.velocity;
          hits.push({
            instrument: hit.instrument,
            timeOffset,
            velocity,
          });
          if (hit.flam) {
            hits.push({
              instrument: hit.instrument,
              timeOffset: timeOffset + FLAM_DELAY_SECONDS,
              velocity: velocity * FLAM_VELOCITY_SCALE,
            });
          }
        }
        visual = {
          isAccent: playableStep.hits.some((hit) => hit.velocity >= 0.8),
          measure:
            Math.floor(currentAbsoluteSixteenthStep / sixteenthsPerBar) + 1,
          phase: "pattern",
          step: playableStep.stepInBar,
        };
      }
    }

    const plan: PlannedPatternTick = {
      guidance,
      hits,
      patternChange,
      semanticCallbackId: null,
      visual,
    };
    this.plannedTicks.set(transportSixteenth, plan);
    return plan;
  }

  private playPatternTick(
    plan: PlannedPatternTick,
    transportSixteenth: number,
    time: number,
    generation: number,
    options: PatternSchedulerOptions,
  ): void {
    if (plan.guidance.bpmChange !== null) {
      this.runtime.setBpmAtTime(plan.guidance.bpmChange, time);
    }
    if (plan.guidance.shouldStop) this.targetStopState = "pending";

    for (const hit of plan.hits) {
      this.instruments.trigger(
        hit.instrument,
        time + hit.timeOffset,
        hit.velocity,
      );
    }

    if (plan.visual) {
      const visual = plan.visual;
      const drawGeneration = this.drawGeneration;
      this.runtime.scheduleDraw(() => {
        if (!this.isDrawCurrent(generation, drawGeneration)) return;
        this.timeline.emit(visual);
      }, time);
    }

    if (plan.semanticCallbackId !== null) return;

    const callbackGeneration = this.callbackGeneration;
    let callbackId: number | null = null;
    let deliveredSynchronously = false;
    const scheduledId = this.runtime.scheduleCallback(() => {
      deliveredSynchronously = true;
      if (callbackId !== null) this.callbackIds.delete(callbackId);
      if (!this.isCallbackCurrent(generation, callbackGeneration)) return;

      plan.semanticCallbackId = null;
      if (this.plannedTicks.get(transportSixteenth) === plan) {
        this.plannedTicks.delete(transportSixteenth);
      }
      this.guidedTimeline.publish(plan.guidance.frame);
      if (plan.patternChange) {
        plan.patternChange.onPatternChanged(plan.patternChange.pattern);
      }
      if (plan.visual && !this.hasStarted) {
        this.hasStarted = true;
        options.onPatternStarted();
      }
      if (plan.guidance.shouldStop) {
        this.targetStopState = "delivered";
        options.onTargetStop?.();
      }
    }, time);
    callbackId = scheduledId;
    if (!deliveredSynchronously) {
      plan.semanticCallbackId = scheduledId;
      this.callbackIds.add(scheduledId);
    }
  }

  private applyPattern(pattern: DrumPattern): void {
    this.activePattern = pattern;
    this.patternAbsoluteSixteenth = 0;
    this.guidedController.setTimeSignature(pattern.timeSignature);
    this.runtime.setTimeSignature(
      pattern.timeSignature.numerator,
      pattern.timeSignature.denominator,
    );
    this.setSwing(pattern.swing ?? 0);
    this.isCurrentMeasureFill = false;
    this.previousMeasureWasFill = false;
  }

  private cancelPendingCallbacks(): void {
    this.callbackGeneration += 1;
    for (const callbackId of this.callbackIds) {
      this.runtime.clearCallback(callbackId);
    }
    this.callbackIds.clear();
    for (const plan of this.plannedTicks.values()) {
      plan.semanticCallbackId = null;
    }
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

  private isCallbackCurrent(
    scheduleGeneration: number,
    callbackGeneration: number,
  ): boolean {
    return (
      this.isScheduleCurrent(scheduleGeneration) &&
      callbackGeneration === this.callbackGeneration
    );
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
