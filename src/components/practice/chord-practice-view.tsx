"use client";

import styles from "@/components/practice/chord-practice.module.css";
import { ChordBeatCountdown } from "@/components/practice/chord-beat-countdown";
import { ChordProgressionTimeline } from "@/components/practice/chord-progression-timeline";
import { getChordTrainerPosition } from "@/lib/guided-practice";
import type { AudioEngineStatus } from "@/types/audio";
import type { TimeSignature } from "@/types/pattern";
import type {
  ChordTrainerConfiguration,
  ChordTrainerPosition,
  GuidanceFrame,
} from "@/types/practice";

export function ChordPracticeView({
  configuration,
  snapshot,
  status,
  timeSignature,
}: {
  configuration: ChordTrainerConfiguration;
  snapshot: GuidanceFrame | null;
  status?: AudioEngineStatus;
  timeSignature: TimeSignature;
}) {
  const frame = snapshot?.mode === "chords" ? snapshot : null;
  const position =
    frame?.position ?? getChordTrainerPosition(configuration, timeSignature, 0);
  const chord = position.currentChord ?? "Complete";

  return (
    <section aria-label="Chord trainer guidance" className={styles.view}>
      <div className={styles.layout}>
        <div className={styles.current}>
          <div
            aria-atomic="true"
            aria-live="polite"
            role="group"
            aria-label="Current chord"
          >
            <p className={styles.eyebrow}>Current chord</p>
            <p
              className={styles.chord}
              data-long={chord.length > 6}
              data-testid="current-chord"
            >
              {chord}
            </p>
          </div>
          <div className={styles.countdown}>
            <ChordChangeCountdown
              measure={frame?.measure ?? 1}
              position={position}
              showCountdown={configuration.showCountdown}
              timeSignature={timeSignature}
            />
          </div>
          <div aria-label="Next chord" className={styles.next} role="group">
            <span className="sr-only">Next chord</span>
            <p>
              <span className={styles.nextLabel}>Next: </span>
              <strong>{position.nextChord ?? "Finish"}</strong>
            </p>
          </div>
          {status === "counting-in" ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Get ready · start after the count-in
            </p>
          ) : null}
        </div>
        <ChordProgressionTimeline
          position={position}
          progression={configuration.progression}
          status={status}
        />
      </div>
    </section>
  );
}

function ChordChangeCountdown({
  measure,
  position,
  showCountdown,
  timeSignature,
}: {
  measure: number;
  position: ChordTrainerPosition;
  showCountdown: boolean;
  timeSignature: TimeSignature;
}) {
  const countdown = showCountdown ? position.countdown : null;
  if (countdown === null || position.isComplete) {
    return (
      <p className={styles.changeText}>
        {position.isComplete ? "Progression complete" : `Measure ${measure}`}
      </p>
    );
  }

  const currentBeat =
    Math.floor(position.sixteenthsIntoStep / (16 / timeSignature.denominator)) %
    timeSignature.numerator;
  // Show at most one bar, trimming a short chord's final group at its boundary.
  const beatCount = Math.min(timeSignature.numerator, currentBeat + countdown);

  return (
    <>
      <ChordBeatCountdown beatCount={beatCount} currentBeat={currentBeat} />
      <p className={styles.changeText}>
        {`${position.nextChord === null ? "Finish" : "Change"} in ${countdown} ${countdown === 1 ? "beat" : "beats"}`}
      </p>
    </>
  );
}
