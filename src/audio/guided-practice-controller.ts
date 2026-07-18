import {
  getChordTrainerPosition,
  getStrumPosition,
  isStrummingPatternMeterCompatible,
} from "@/lib/guided-practice";
import { getTempoTrainerPosition } from "@/lib/tempo-trainer";
import type { TimeSignature } from "@/types/pattern";
import type {
  GuidanceFrame,
  GuidedPracticeConfiguration,
} from "@/types/practice";

export interface GuidedPracticeTick {
  bpmChange: number | null;
  frame: GuidanceFrame;
  shouldStop: boolean;
}

function isSameMeter(left: TimeSignature, right: TimeSignature): boolean {
  return (
    left.numerator === right.numerator && left.denominator === right.denominator
  );
}

function getSixteenthsPerMeasure(timeSignature: TimeSignature): number {
  return timeSignature.numerator * (16 / timeSignature.denominator);
}

function assertBpm(bpm: number): void {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new RangeError("Guided practice BPM must be a positive number.");
  }
}

function assertTimeSignature(timeSignature: TimeSignature): void {
  const sixteenths = getSixteenthsPerMeasure(timeSignature);
  if (!Number.isInteger(sixteenths) || sixteenths <= 0) {
    throw new RangeError(
      "Guided practice requires a whole number of sixteenths per measure.",
    );
  }
}

export class GuidedPracticeController {
  private absoluteSixteenth = 0;
  private completedMeasures = 0;
  private configuration: GuidedPracticeConfiguration | null = null;
  private currentBpm = 90;
  private elapsedSeconds = 0;
  private latestMeasureBoundarySeconds = 0;
  private pendingTimeSignature: TimeSignature | null = null;
  private sixteenthInMeasure = 0;
  private stopSignaled = false;
  private timeSignature: TimeSignature | null = null;

  begin(
    configuration: GuidedPracticeConfiguration,
    timeSignature: TimeSignature,
    bpm: number,
  ): void {
    assertTimeSignature(timeSignature);
    assertBpm(bpm);
    if (
      configuration.mode === "strumming" &&
      !isStrummingPatternMeterCompatible(
        configuration.strummingPattern,
        timeSignature,
      )
    ) {
      throw new Error(
        "The drum pattern time signature must match the strumming pattern.",
      );
    }
    if (
      configuration.mode === "tempoTrainer" &&
      configuration.tempoTrainer.startBpm === configuration.tempoTrainer.endBpm
    ) {
      throw new RangeError(
        "Tempo trainer starting and ending BPM must be different.",
      );
    }

    this.reset();
    this.configuration = configuration;
    this.timeSignature = { ...timeSignature };
    this.currentBpm =
      configuration.mode === "tempoTrainer"
        ? configuration.tempoTrainer.startBpm
        : bpm;
  }

  isTimeSignatureCompatible(timeSignature: TimeSignature): boolean {
    if (!this.configuration || !this.timeSignature) return true;

    if (this.configuration.mode === "chords") {
      return isSameMeter(this.timeSignature, timeSignature);
    }
    if (this.configuration.mode === "strumming") {
      return isStrummingPatternMeterCompatible(
        this.configuration.strummingPattern,
        timeSignature,
      );
    }
    return true;
  }

  rearmTargetStop(): void {
    this.stopSignaled = false;
  }

  reset(): void {
    this.absoluteSixteenth = 0;
    this.completedMeasures = 0;
    this.configuration = null;
    this.currentBpm = 90;
    this.elapsedSeconds = 0;
    this.latestMeasureBoundarySeconds = 0;
    this.pendingTimeSignature = null;
    this.sixteenthInMeasure = 0;
    this.stopSignaled = false;
    this.timeSignature = null;
  }

  setBpm(bpm: number): void {
    assertBpm(bpm);
    if (this.configuration?.mode !== "tempoTrainer") this.currentBpm = bpm;
  }

  setTimeSignature(timeSignature: TimeSignature): boolean {
    assertTimeSignature(timeSignature);
    if (!this.isTimeSignatureCompatible(timeSignature)) return false;

    if (!this.timeSignature || this.sixteenthInMeasure === 0) {
      this.timeSignature = { ...timeSignature };
      this.pendingTimeSignature = null;
    } else {
      this.pendingTimeSignature = { ...timeSignature };
    }
    return true;
  }

  tick(): GuidedPracticeTick {
    const configuration = this.configuration;
    const timeSignature = this.timeSignature;
    if (!configuration || !timeSignature) {
      throw new Error("Guided practice has not begun.");
    }

    if (this.absoluteSixteenth > 0) {
      this.elapsedSeconds += 15 / this.currentBpm;
    }
    if (this.sixteenthInMeasure === 0) {
      this.latestMeasureBoundarySeconds = this.elapsedSeconds;
    }

    const base = {
      absoluteSixteenth: this.absoluteSixteenth,
      elapsedSeconds: this.elapsedSeconds,
      measure: this.completedMeasures + 1,
    };
    let bpmChange: number | null = null;
    let shouldStop = false;
    let frame: GuidanceFrame;

    switch (configuration.mode) {
      case "drums":
        frame = { ...base, mode: "drums" };
        break;
      case "tempoTrainer": {
        const position = getTempoTrainerPosition(configuration.tempoTrainer, {
          completedMeasures: this.completedMeasures,
          elapsedSeconds: this.elapsedSeconds,
          latestMeasureBoundarySeconds: this.latestMeasureBoundarySeconds,
        });
        if (position.currentBpm !== this.currentBpm) {
          this.currentBpm = position.currentBpm;
          bpmChange = position.currentBpm;
        }
        shouldStop = position.shouldStop && !this.stopSignaled;
        if (shouldStop) this.stopSignaled = true;
        frame = { ...base, mode: "tempoTrainer", position };
        break;
      }
      case "chords":
        frame = {
          ...base,
          mode: "chords",
          position: getChordTrainerPosition(
            configuration.chordTrainer,
            timeSignature,
            this.absoluteSixteenth,
          ),
        };
        break;
      case "strumming":
        frame = {
          ...base,
          mode: "strumming",
          position: getStrumPosition(
            configuration.strummingPattern,
            this.absoluteSixteenth,
          ),
        };
        break;
    }

    this.advanceClock(timeSignature);
    return { bpmChange, frame, shouldStop };
  }

  private advanceClock(timeSignature: TimeSignature): void {
    this.absoluteSixteenth += 1;
    this.sixteenthInMeasure += 1;
    if (this.sixteenthInMeasure < getSixteenthsPerMeasure(timeSignature)) {
      return;
    }

    this.completedMeasures += 1;
    this.sixteenthInMeasure = 0;
    if (this.pendingTimeSignature) {
      this.timeSignature = this.pendingTimeSignature;
      this.pendingTimeSignature = null;
    }
  }
}
