import { describe, expect, it } from "vitest";

import {
  getCurrentLocalWeekDuration,
  getMostUsedBpmRange,
  getMostUsedPattern,
  getPracticeSessionCount,
  getTotalPracticeDuration,
  groupSessionsByLocalDay,
} from "@/lib/practice-history";
import type { PracticeSession } from "@/types/persistence";

function session(
  id: string,
  startedAt: string,
  durationSeconds: number,
  patternName: string,
  startingBpm: number,
  endingBpm = startingBpm,
  patternId = patternName.toLowerCase().replaceAll(" ", "-"),
): PracticeSession {
  const endedAt = new Date(
    Date.parse(startedAt) + durationSeconds * 1_000,
  ).toISOString();
  return {
    category: "rock",
    createdAt: startedAt,
    durationSeconds,
    endedAt,
    endingBpm,
    id,
    patternId,
    patternName,
    practiceMode: "drums",
    startedAt,
    startingBpm,
    timeSignature: "4/4",
    updatedAt: endedAt,
  };
}

describe("practice history aggregation", () => {
  const sessions = [
    session("a", "2026-07-13T09:00:00.000Z", 120, "Basic Rock", 90),
    session("b", "2026-07-14T10:00:00.000Z", 180, "One Drop", 105),
    session("c", "2026-07-14T18:00:00.000Z", 60, "Basic Rock", 92),
    session("d", "2026-07-12T10:00:00.000Z", 300, "Sunday Song", 125),
  ];

  it("totals local records and counts sessions", () => {
    expect(getTotalPracticeDuration(sessions)).toBe(660);
    expect(getPracticeSessionCount(sessions)).toBe(4);
  });

  it("counts the current local Monday-start week", () => {
    const now = new Date(2026, 6, 15, 12);
    const monday = new Date(2026, 6, 13, 9).toISOString();
    const tuesday = new Date(2026, 6, 14, 10).toISOString();
    const sundayBefore = new Date(2026, 6, 12, 23, 59).toISOString();
    expect(
      getCurrentLocalWeekDuration(
        [
          session("m", monday, 100, "A", 80),
          session("t", tuesday, 200, "B", 100),
          session("s", sundayBefore, 400, "C", 120),
        ],
        now,
      ),
    ).toBe(300);
  });

  it("finds duration leaders with deterministic tie-breaks", () => {
    expect(getMostUsedPattern(sessions)).toEqual({
      durationSeconds: 300,
      patternId: "sunday-song",
      patternName: "Sunday Song",
    });
    expect(
      getMostUsedPattern([
        session("z", "2026-07-14T10:00:00.000Z", 60, "Zulu", 90),
        session("a", "2026-07-14T11:00:00.000Z", 60, "Alpha", 90),
      ])?.patternName,
    ).toBe("Alpha");

    expect(getMostUsedBpmRange(sessions)).toEqual({
      durationSeconds: 300,
      maximumBpm: 139,
      minimumBpm: 120,
    });
    expect(
      getMostUsedBpmRange([
        session("high", "2026-07-14T10:00:00.000Z", 60, "High", 100),
        session("low", "2026-07-14T11:00:00.000Z", 60, "Low", 80),
      ])?.minimumBpm,
    ).toBe(80);
  });

  it("uses both session BPM endpoints and the latest pattern name", () => {
    expect(
      getMostUsedBpmRange([
        session("ramp", "2026-07-14T10:00:00.000Z", 60, "Ramp", 80, 140),
      ]),
    ).toMatchObject({ minimumBpm: 100, maximumBpm: 119 });

    expect(
      getMostUsedPattern([
        session(
          "new",
          "2026-07-15T10:00:00.000Z",
          60,
          "New name",
          90,
          90,
          "renamed-pattern",
        ),
        session(
          "old",
          "2026-07-14T10:00:00.000Z",
          60,
          "Old name",
          90,
          90,
          "renamed-pattern",
        ),
      ])?.patternName,
    ).toBe("New name");
  });

  it("groups local calendar days and sessions newest-first", () => {
    const grouped = groupSessionsByLocalDay(sessions);
    expect(grouped.map(({ dateKey }) => dateKey)).toEqual([
      "2026-07-14",
      "2026-07-13",
      "2026-07-12",
    ]);
    expect(grouped[0]?.sessions.map(({ id }) => id)).toEqual(["c", "b"]);
  });
});
