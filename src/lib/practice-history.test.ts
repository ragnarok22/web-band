import { describe, expect, it } from "vitest";

import {
  formatHistoryDuration,
  getCurrentLocalWeekDuration,
  getHistoryActivity,
  getHistoryChartScale,
  getMostPracticedMode,
  getPracticeSessionCount,
  getPracticeSessionTitle,
  getTotalPracticeDuration,
  groupSessionsByLocalDay,
  selectHistorySessions,
} from "@/lib/practice-history";
import { historySession } from "@/test/history-fixtures";

const now = new Date(2026, 9, 20, 15);
const local = (day: number, hour = 12, minute = 0) =>
  new Date(2026, 9, day, hour, minute).toISOString();

describe("practice history calculations", () => {
  const sessions = [
    historySession("monday", { startedAt: local(19), durationSeconds: 80 }),
    historySession("today", {
      practiceMode: "metronome",
      startedAt: local(20),
      durationSeconds: 31,
    }),
    historySession("before-week", {
      startedAt: local(18, 23, 59),
      durationSeconds: 120,
    }),
  ];

  it("totals stored duration rather than elapsed wall-clock time", () => {
    expect(getTotalPracticeDuration(sessions)).toBe(231);
    expect(getPracticeSessionCount(sessions)).toBe(3);
    expect(
      getTotalPracticeDuration([{ ...sessions[0]!, endedAt: local(20) }]),
    ).toBe(80);
  });

  it("preserves Monday-start local weeks with exclusive next-week boundaries", () => {
    expect(
      getCurrentLocalWeekDuration(
        [
          ...sessions,
          historySession("next-week", {
            startedAt: local(26, 0),
            durationSeconds: 300,
          }),
        ],
        now,
      ),
    ).toBe(111);
    expect(
      getCurrentLocalWeekDuration(sessions, new Date(2026, 9, 25, 23, 59)),
    ).toBe(111);
  });

  it("finds the most practiced mode by duration, not session count", () => {
    expect(
      getMostPracticedMode([
        historySession("a", { durationSeconds: 10 }),
        historySession("b", { durationSeconds: 10 }),
        historySession("c", { practiceMode: "metronome", durationSeconds: 31 }),
      ]),
    ).toEqual({ mode: "metronome", durationSeconds: 31 });
  });

  it("uses a fixed mode order to break ties independently of input order", () => {
    const tied = [
      historySession("a", { practiceMode: "chords" }),
      historySession("b"),
    ];
    expect(getMostPracticedMode(tied)).toEqual(
      getMostPracticedMode([...tied].reverse()),
    );
    expect(getMostPracticedMode(tied)?.mode).toBe("drums");
  });

  it.each([
    "drums",
    "strumming",
    "chords",
    "tempoTrainer",
    "metronome",
  ] as const)("handles a single %s session", (practiceMode) => {
    const entry = historySession("single", { practiceMode });
    expect(getMostPracticedMode([entry])).toEqual({
      mode: practiceMode,
      durationSeconds: 31,
    });
    expect(getHistoryActivity([entry], now).at(-1)?.durationSeconds).toBe(31);
    expect(getPracticeSessionTitle(entry)).toBe(
      practiceMode === "drums"
        ? "Basic Rock"
        : {
            strumming: "Strumming",
            chords: "Chords",
            tempoTrainer: "Tempo Trainer",
            metronome: "Metronome",
          }[practiceMode as Exclude<typeof practiceMode, "drums">],
    );
  });

  it("returns neutral statistics and seven zero days for empty history", () => {
    expect(getTotalPracticeDuration([])).toBe(0);
    expect(getCurrentLocalWeekDuration([], now)).toBe(0);
    expect(getPracticeSessionCount([])).toBe(0);
    expect(getMostPracticedMode([])).toBeNull();
    expect(getHistoryActivity([], now)).toHaveLength(7);
    expect(
      getHistoryActivity([], now).every((day) => day.durationSeconds === 0),
    ).toBe(true);
  });

  it("aggregates the last seven calendar days, including zero days and today", () => {
    const days = getHistoryActivity(
      [
        ...sessions,
        historySession("first-day", {
          startedAt: local(14, 0),
          durationSeconds: 1,
        }),
        historySession("too-old", {
          startedAt: local(13, 23, 59),
          durationSeconds: 500,
        }),
        historySession("tomorrow", {
          startedAt: local(21, 0),
          durationSeconds: 500,
        }),
      ],
      now,
    );
    expect(days.map((day) => day.dateKey)).toEqual([
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
    ]);
    expect(days.map((day) => day.durationSeconds)).toEqual([
      1, 0, 0, 0, 120, 80, 31,
    ]);
    expect(days.map((day) => day.isToday)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  it("attributes midnight-spanning sessions once, to their local start day", () => {
    const entries = [
      historySession("before", {
        startedAt: local(19, 23, 59),
        durationSeconds: 180,
      }),
      historySession("after", { startedAt: local(20, 0), durationSeconds: 1 }),
    ];
    expect(
      getHistoryActivity(entries, now)
        .slice(-2)
        .map((day) => day.durationSeconds),
    ).toEqual([180, 1]);
    expect(
      groupSessionsByLocalDay(entries).map((day) => [
        day.dateKey,
        day.durationSeconds,
        day.sessions.length,
      ]),
    ).toEqual([
      ["2026-10-20", 1, 1],
      ["2026-10-19", 180, 1],
    ]);
  });

  it("builds calendar days across month, year, and daylight-saving boundaries", () => {
    for (const date of [
      new Date(2027, 0, 3, 12),
      new Date(2026, 2, 10, 12),
      new Date(2026, 10, 3, 12),
    ]) {
      const days = getHistoryActivity([], date);
      expect(new Set(days.map((day) => day.dateKey)).size).toBe(7);
      expect(days.at(-1)?.date.getDate()).toBe(date.getDate());
      for (let index = 1; index < days.length; index++) {
        const next = new Date(days[index - 1]!.date);
        next.setDate(next.getDate() + 1);
        expect(days[index]!.date.getTime()).toBe(next.getTime());
      }
    }
  });

  it.each([
    [0, "0 sec"],
    [1, "1 sec"],
    [31, "31 sec"],
    [60, "1 min"],
    [61, "1 min 1 sec"],
    [3599, "59 min 59 sec"],
    [3600, "1h"],
    [3661, "1h 1m 1s"],
    [86400, "24h"],
  ])("formats %s seconds accurately", (seconds, expected) => {
    expect(formatHistoryDuration(seconds as number)).toBe(expected);
  });

  it("scales short activity in seconds without rounding it to zero", () => {
    expect(getHistoryChartScale(1)).toEqual({
      maximumSeconds: 1,
      label: "1 sec",
    });
    expect(getHistoryChartScale(31)).toEqual({
      maximumSeconds: 40,
      label: "40 sec",
    });
    expect(getHistoryChartScale(120)).toEqual({
      maximumSeconds: 120,
      label: "2 min",
    });
    expect(getHistoryChartScale(0).maximumSeconds).toBeGreaterThan(0);
  });
});

describe("history selection and grouping", () => {
  const sessions = [
    historySession("old", { startedAt: local(1), durationSeconds: 300 }),
    historySession("cutoff", { startedAt: local(14, 0), durationSeconds: 120 }),
    historySession("before", {
      startedAt: local(13, 23, 59),
      durationSeconds: 200,
    }),
    historySession("today", {
      practiceMode: "metronome",
      startedAt: local(20),
      durationSeconds: 31,
    }),
    historySession("today-drums", {
      startedAt: local(20, 10),
      durationSeconds: 60,
    }),
  ];

  it("combines mode and date filters without changing the original collection", () => {
    const original = [...sessions];
    expect(
      selectHistorySessions(
        sessions,
        { mode: "drums", range: "7", sort: "newest" },
        now,
      ).map(({ id }) => id),
    ).toEqual(["today-drums", "cutoff"]);
    expect(sessions).toEqual(original);
    expect(
      selectHistorySessions(
        sessions,
        { mode: "all", range: "all", sort: "newest" },
        now,
      ),
    ).not.toBe(sessions);
  });

  it("uses inclusive local first-day and exclusive tomorrow boundaries for date filters", () => {
    const entries = [
      historySession("first", {
        startedAt: new Date(2026, 8, 21, 0).toISOString(),
      }),
      historySession("before", {
        startedAt: new Date(2026, 8, 20, 23, 59).toISOString(),
      }),
      historySession("tomorrow", { startedAt: local(21, 0) }),
    ];
    expect(
      selectHistorySessions(
        entries,
        { mode: "all", range: "30", sort: "newest" },
        now,
      ).map(({ id }) => id),
    ).toEqual(["first"]);
  });

  it("sorts newest, oldest and longest with stable ID tie-breaks", () => {
    const filters = { mode: "all", range: "all" } as const;
    expect(
      selectHistorySessions(sessions, { ...filters, sort: "oldest" }, now)[0]
        ?.id,
    ).toBe("old");
    expect(
      selectHistorySessions(sessions, { ...filters, sort: "newest" }, now)[0]
        ?.id,
    ).toBe("today");
    expect(
      selectHistorySessions(sessions, { ...filters, sort: "longest" }, now).map(
        ({ id }) => id,
      ),
    ).toEqual(["old", "before", "cutoff", "today-drums", "today"]);
    const tied = [historySession("z"), historySession("a")];
    expect(
      selectHistorySessions(tied, { ...filters, sort: "longest" }, now).map(
        ({ id }) => id,
      ),
    ).toEqual(["a", "z"]);
  });

  it("orders day groups and their sessions according to the selected sort", () => {
    expect(
      groupSessionsByLocalDay(sessions, "oldest").map(({ dateKey }) => dateKey),
    ).toEqual(["2026-10-01", "2026-10-13", "2026-10-14", "2026-10-20"]);
    const groups = groupSessionsByLocalDay(sessions, "longest");
    expect(groups.map(({ dateKey }) => dateKey)).toEqual([
      "2026-10-01",
      "2026-10-13",
      "2026-10-14",
      "2026-10-20",
    ]);
    expect(groups.at(-1)?.sessions.map(({ id }) => id)).toEqual([
      "today-drums",
      "today",
    ]);
    expect(groups.at(-1)?.durationSeconds).toBe(91);
    expect(groups.flatMap(({ sessions }) => sessions)).toHaveLength(
      sessions.length,
    );
  });

  it("returns no results for unmatched modes and empty collections", () => {
    expect(
      selectHistorySessions(
        sessions,
        { mode: "chords", range: "all", sort: "newest" },
        now,
      ),
    ).toEqual([]);
    expect(groupSessionsByLocalDay([])).toEqual([]);
  });
});
