"use client";

import styles from "@/components/practice/chord-practice.module.css";
import { ChordProgressionTimeline } from "@/components/practice/chord-progression-timeline";
import { getChordTrainerPosition } from "@/lib/guided-practice";
import type { AudioEngineStatus } from "@/types/audio";
import type { TimeSignature } from "@/types/pattern";
import type {
  ChordTrainerConfiguration,
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
  const duration = position.sixteenthsIntoStep + position.sixteenthsRemaining;
  const countdown = configuration.showCountdown ? position.countdown : null;
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
            {countdown !== null && !position.isComplete ? (
              <>
                <p className={styles.changeText}>
                  {`${position.nextChord === null ? "Finish" : "Change"} in ${countdown} ${countdown === 1 ? "beat" : "beats"}`}
                </p>
                <progress
                  aria-label="Current chord progress"
                  aria-valuetext={`${countdown} ${countdown === 1 ? "beat" : "beats"} remaining`}
                  className={styles.progress}
                  max={duration}
                  value={position.sixteenthsIntoStep}
                />
              </>
            ) : (
              <p className={styles.changeText}>
                {position.isComplete
                  ? "Progression complete"
                  : `Measure ${frame?.measure ?? 1}`}
              </p>
            )}
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
        />
      </div>
    </section>
  );
}
