import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { storageService } from "@/db/storage-service";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import type { PracticeSession } from "@/types/persistence";

function createSession(
  id: string,
  startedAt = "2026-07-18T12:00:00.000Z",
): PracticeSession {
  const endedAt = new Date(Date.parse(startedAt) + 60_000).toISOString();
  return {
    category: "rock",
    createdAt: startedAt,
    durationSeconds: 60,
    endedAt,
    endingBpm: 100,
    id,
    patternId: "basic-rock",
    patternName: "Basic Rock",
    practiceMode: "drums",
    startedAt,
    startingBpm: 90,
    timeSignature: "4/4",
    updatedAt: endedAt,
  };
}

beforeEach(async () => {
  storageService.close();
  vi.stubGlobal("indexedDB", undefined);
  usePracticeHistoryStore.setState({
    errorMessage: null,
    isHydrated: false,
    isLoading: false,
    sessions: [],
  });
  await storageService.initialize();
});

afterEach(() => {
  storageService.close();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("practice history store", () => {
  it("hydrates, records, deletes, clears, and refreshes imported sessions", async () => {
    const older = createSession("older", "2026-07-17T12:00:00.000Z");
    const newer = createSession("newer");
    await storageService.practiceSessionRepository.put(older);

    await usePracticeHistoryStore.getState().hydrate();
    expect(usePracticeHistoryStore.getState().sessions).toEqual([older]);

    await usePracticeHistoryStore.getState().record(newer);
    expect(
      usePracticeHistoryStore.getState().sessions.map(({ id }) => id),
    ).toEqual(["newer", "older"]);

    await usePracticeHistoryStore.getState().deleteOne("older");
    expect(usePracticeHistoryStore.getState().sessions).toEqual([newer]);

    await storageService.practiceSessionRepository.put(older);
    await usePracticeHistoryStore.getState().refreshAfterImport();
    expect(
      usePracticeHistoryStore.getState().sessions.map(({ id }) => id),
    ).toEqual(["newer", "older"]);

    await usePracticeHistoryStore.getState().clearAll();
    expect(usePracticeHistoryStore.getState().sessions).toEqual([]);
  });

  it("validates before writes and preserves state when operations fail", async () => {
    const existing = createSession("existing");
    usePracticeHistoryStore.setState({ sessions: [existing] });
    const put = vi
      .spyOn(storageService.practiceSessionRepository, "put")
      .mockRejectedValue(new Error("write failed"));

    await expect(
      usePracticeHistoryStore.getState().record({
        ...createSession("invalid"),
        durationSeconds: 0,
      }),
    ).rejects.toThrow("valid practice session");
    expect(put).not.toHaveBeenCalled();
    expect(usePracticeHistoryStore.getState().sessions).toEqual([existing]);

    await expect(
      usePracticeHistoryStore.getState().record(createSession("new")),
    ).rejects.toThrow("write failed");
    expect(usePracticeHistoryStore.getState().sessions).toEqual([existing]);

    vi.spyOn(
      storageService.practiceSessionRepository,
      "delete",
    ).mockRejectedValue(new Error("delete failed"));
    await expect(
      usePracticeHistoryStore.getState().deleteOne(existing.id),
    ).rejects.toThrow("delete failed");
    expect(usePracticeHistoryStore.getState().sessions).toEqual([existing]);
  });

  it("serializes hydration before a new record so hydration cannot erase it", async () => {
    const persisted = createSession("persisted", "2026-07-17T12:00:00.000Z");
    const recorded = createSession("recorded");
    let releaseList!: (sessions: PracticeSession[]) => void;
    vi.spyOn(storageService.practiceSessionRepository, "list").mockReturnValue(
      new Promise((resolve) => {
        releaseList = resolve;
      }),
    );
    const put = vi.spyOn(storageService.practiceSessionRepository, "put");

    const hydration = usePracticeHistoryStore.getState().hydrate();
    const recording = usePracticeHistoryStore.getState().record(recorded);
    expect(put).not.toHaveBeenCalled();

    releaseList([persisted]);
    await Promise.all([hydration, recording]);

    expect(
      usePracticeHistoryStore.getState().sessions.map(({ id }) => id),
    ).toEqual(["recorded", "persisted"]);
  });

  it("upserts a longer final record over a same-session checkpoint", async () => {
    const finalRecord = createSession("stable-session");
    const checkpointEndedAt = new Date(
      Date.parse(finalRecord.startedAt) + 30_000,
    ).toISOString();
    const checkpoint = {
      ...finalRecord,
      durationSeconds: 30,
      endedAt: checkpointEndedAt,
      updatedAt: checkpointEndedAt,
    };

    const checkpointWrite = usePracticeHistoryStore
      .getState()
      .record(checkpoint);
    const finalWrite = usePracticeHistoryStore.getState().record(finalRecord);
    await Promise.all([checkpointWrite, finalWrite]);

    expect(usePracticeHistoryStore.getState().sessions).toEqual([finalRecord]);
    expect(await storageService.practiceSessionRepository.list()).toEqual([
      finalRecord,
    ]);
  });
});
