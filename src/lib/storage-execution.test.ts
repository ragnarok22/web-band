import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { basicRockPattern } from "@/data/patterns";
import { storageService } from "@/db/storage-service";
import { executeStorageOperation } from "@/lib/storage-execution";
import { usePatternStore } from "@/stores/pattern-store";
import { useStorageStore } from "@/stores/storage-store";
import type { CustomDrumPattern } from "@/types/persistence";

const timestamp = "2026-07-18T12:00:00.000Z";

function createPattern(id: string): CustomDrumPattern {
  return {
    ...structuredClone(basicRockPattern),
    createdAt: timestamp,
    id,
    isBuiltIn: false,
    name: id,
    updatedAt: timestamp,
  };
}

beforeEach(async () => {
  storageService.close();
  useStorageStore.setState({
    isInitialized: false,
    mode: "memory",
    warning: null,
  });
  usePatternStore.setState({
    customPatterns: [],
    favoritePatternIds: [],
    isHydrated: true,
    recentPatternIds: [],
  });
  await storageService.initialize(`web-band-test-${crypto.randomUUID()}`);
});

afterEach(() => {
  storageService.close();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("storage execution", () => {
  it("preserves readable data, warns, and retries a store quota failure once in memory", async () => {
    const preserved = createPattern("preserved");
    const incoming = createPattern("incoming");
    await storageService.patternRepository.put(preserved);
    usePatternStore.setState({ customPatterns: [preserved] });
    const indexedDbRepository = storageService.patternRepository;
    vi.spyOn(indexedDbRepository, "put").mockRejectedValueOnce(
      new DOMException("Quota exceeded", "QuotaExceededError"),
    );
    await usePatternStore.getState().create(incoming);

    expect(indexedDbRepository.put).toHaveBeenCalledOnce();
    expect(useStorageStore.getState()).toMatchObject({
      isInitialized: true,
      mode: "memory",
    });
    expect(useStorageStore.getState().warning).toContain(
      "Practice can continue",
    );
    expect(
      (await storageService.patternRepository.list()).map(({ id }) => id),
    ).toEqual(["incoming", "preserved"]);
    expect(
      usePatternStore.getState().customPatterns.map(({ id }) => id),
    ).toEqual(["incoming", "preserved"]);
  });

  it("preserves other records and retries a failed delete transaction in memory", async () => {
    const deleted = createPattern("deleted");
    const preserved = createPattern("preserved");
    await storageService.patternRepository.put(deleted);
    await storageService.patternRepository.put(preserved);
    await storageService.favoriteRepository.add(deleted.id);
    vi.spyOn(storageService, "deleteCustomPattern").mockRejectedValueOnce(
      new Error("Transaction failed"),
    );

    await executeStorageOperation(() =>
      storageService.deleteCustomPattern(deleted.id),
    );

    expect(storageService.currentStatus.mode).toBe("memory");
    expect(useStorageStore.getState().warning).toContain(
      "Practice can continue",
    );
    expect(
      await storageService.patternRepository.get(deleted.id),
    ).toBeUndefined();
    expect(await storageService.patternRepository.get(preserved.id)).toEqual(
      preserved,
    );
    expect(await storageService.favoriteRepository.list()).toEqual([]);
  });

  it("does not attempt fallback for validation errors in memory", async () => {
    storageService.close();
    vi.stubGlobal("indexedDB", undefined);
    const recover = vi.spyOn(storageService, "recoverFromIndexedDbFailure");
    let attempts = 0;

    await expect(
      executeStorageOperation(async () => {
        attempts += 1;
        await storageService.patternRepository.put(
          basicRockPattern as CustomDrumPattern,
        );
      }),
    ).rejects.toThrow("Only valid custom patterns can be saved.");

    expect(attempts).toBe(1);
    expect(recover).not.toHaveBeenCalled();
  });
});
