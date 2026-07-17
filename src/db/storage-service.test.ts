import { afterEach, describe, expect, it, vi } from "vitest";

import { StorageService } from "@/db/storage-service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage service", () => {
  it("initializes the versioned IndexedDB database", async () => {
    const service = new StorageService();
    const status = await service.initialize(
      `web-band-test-${crypto.randomUUID()}`,
    );

    expect(status).toEqual({ mode: "indexed-db", warning: null });
    service.close();
  });

  it("falls back to memory when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const service = new StorageService();
    const status = await service.initialize();

    expect(status.mode).toBe("memory");
    expect(status.warning).toContain("Practice can continue");
  });
});
