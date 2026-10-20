import {
  formatHistoryDuration,
  getHistorySubdivision,
  historyModeLabels,
} from "@/lib/practice-history";
import type { PracticeSession } from "@/types/persistence";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function HistorySessionDetails({
  session,
}: {
  session: PracticeSession;
}) {
  const details = [
    ["Started", dateTimeFormatter.format(new Date(session.startedAt))],
    ["Ended", dateTimeFormatter.format(new Date(session.endedAt))],
    ["Saved practice", formatHistoryDuration(session.durationSeconds)],
    ["Practice mode", historyModeLabels[session.practiceMode]],
    ["Starting BPM", String(session.startingBpm)],
    ["Ending BPM", String(session.endingBpm)],
    ["Time signature", session.timeSignature],
    ...(session.practiceMode === "metronome"
      ? [
          [
            session.metronome.trainingMode === "progressive"
              ? "Starting subdivision"
              : "Subdivision",
            getHistorySubdivision(session),
          ],
          [
            "Training",
            session.metronome.trainingMode === "progressive"
              ? "Progressive"
              : "Manual",
          ],
        ]
      : [
          [
            session.practiceMode === "drums" ? "Pattern" : "Drum accompaniment",
            session.patternName,
          ],
        ]),
  ];
  return (
    <dl className="border-border mt-3 grid grid-cols-1 gap-x-6 gap-y-3 border-t pt-4 text-xs sm:grid-cols-2">
      {details.map(([label, value]) => (
        <div className="min-w-0" key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-semibold [overflow-wrap:anywhere] break-words">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
