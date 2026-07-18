import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultHistorySettings } from "@/db/repositories/history-settings-repository";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { createBackupEnvelope } from "@/lib/backup-envelope";
import {
  BackupService,
  type BackupServiceDependencies,
} from "@/services/backup-service";
import { createDefaultGuidedPracticeValues } from "@/stores/guided-practice-store";
import type {
  BackupEnvelope,
  BackupSettings,
  ImportSummary,
  PersistenceSnapshot,
} from "@/types/persistence";

const emptySnapshot: PersistenceSnapshot = {
  customChordProgressions: [],
  customPatterns: [],
  customStrummingPatterns: [],
  favoriteChordProgressionIds: [],
  favoritePatternIds: [],
  practicePresets: [],
  practiceSessions: [],
};

const importSummary: ImportSummary = {
  imported: {
    customChordProgressions: 0,
    customPatterns: 0,
    customStrummingPatterns: 0,
    favoriteChordProgressionIds: 0,
    favoritePatternIds: 0,
    practicePresets: 0,
    practiceSessions: 0,
  },
  mode: "merge",
  totalImported: 0,
};

function settings(): BackupSettings {
  return {
    guidedPractice: createDefaultGuidedPracticeValues(),
    history: structuredClone(defaultHistorySettings),
    practice: structuredClone(defaultPracticeSettings),
  };
}

function envelope(): BackupEnvelope {
  return createBackupEnvelope(
    emptySnapshot,
    settings(),
    new Date("2026-07-18T12:00:00.000Z"),
  );
}

function dependencies(order: string[] = []): BackupServiceDependencies {
  return {
    applySettings: vi.fn(() => {
      order.push("settings");
      return true;
    }),
    clearAppPreferences: vi.fn(() => {
      order.push("preferences");
      return true;
    }),
    clearRecentPatterns: vi.fn(() => {
      order.push("recents");
      return true;
    }),
    downloadEnvelope: vi.fn(() => order.push("download")),
    executeStorageOperation: vi.fn(async (operation) => operation()),
    getSettings: vi.fn(() => {
      order.push("get-settings");
      return settings();
    }),
    refreshStores: vi.fn(async () => {
      order.push("refresh");
    }),
    storage: {
      exportSnapshot: vi.fn(async () => {
        order.push("export");
        return structuredClone(emptySnapshot);
      }),
      importSnapshot: vi.fn(async (_snapshot, mode) => {
        order.push(`import:${mode}`);
        return { ...importSummary, mode };
      }),
      initialize: vi.fn(async () => ({
        mode: "indexed-db" as const,
        warning: null,
      })),
    },
  };
}

describe("backup service", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("rejects invalid input before snapshotting or mutating anything", async () => {
    const deps = dependencies();
    const service = new BackupService(deps);

    await expect(
      service.importBackup({ app: "web-band" }, "replace"),
    ).rejects.toThrow(/valid Web Band backup/i);
    expect(deps.storage.exportSnapshot).not.toHaveBeenCalled();
    expect(deps.storage.importSnapshot).not.toHaveBeenCalled();
    expect(deps.applySettings).not.toHaveBeenCalled();
    expect(deps.refreshStores).not.toHaveBeenCalled();
  });

  it("merges the database before applying settings and refreshing stores", async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    const service = new BackupService(deps);

    const result = await service.importBackup(envelope(), "merge");

    expect(order).toEqual(["import:merge", "settings", "refresh"]);
    expect(deps.storage.importSnapshot).toHaveBeenCalledWith(
      emptySnapshot,
      "merge",
    );
    expect(deps.applySettings).toHaveBeenCalledWith(envelope().data.settings);
    expect(deps.clearRecentPatterns).not.toHaveBeenCalled();
    expect(result).toMatchObject({ mode: "merge", settingsPersisted: true });
  });

  it("downloads a current backup before a replace mutation", async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    const service = new BackupService(deps);

    await service.importBackup(envelope(), "replace");

    expect(order).toEqual([
      "export",
      "get-settings",
      "download",
      "import:replace",
      "recents",
      "settings",
      "refresh",
    ]);
    expect(deps.downloadEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ app: "web-band", version: 1 }),
    );
  });

  it("preserves live settings when the database import fails", async () => {
    const deps = dependencies();
    vi.mocked(deps.storage.importSnapshot).mockRejectedValueOnce(
      new Error("database failed"),
    );
    const service = new BackupService(deps);

    await expect(service.importBackup(envelope(), "merge")).rejects.toThrow(
      "database failed",
    );
    expect(deps.applySettings).not.toHaveBeenCalled();
    expect(deps.refreshStores).not.toHaveBeenCalled();
  });

  it("keeps imported database data valid while warning on settings persistence failure", async () => {
    const deps = dependencies();
    vi.mocked(deps.applySettings).mockReturnValueOnce(false);
    const service = new BackupService(deps);

    const result = await service.importBackup(envelope(), "merge");

    expect(deps.refreshStores).toHaveBeenCalledOnce();
    expect(result.settingsPersisted).toBe(false);
    expect(result.warning).toMatch(/settings/i);
  });

  it("returns a completion warning when settings throw after import commit", async () => {
    const deps = dependencies();
    vi.mocked(deps.applySettings).mockImplementationOnce(() => {
      throw new Error("localStorage unavailable");
    });
    const service = new BackupService(deps);

    const result = await service.importBackup(envelope(), "merge");

    expect(result.settingsPersisted).toBe(false);
    expect(result.warning).toMatch(/settings/i);
    expect(deps.refreshStores).toHaveBeenCalledOnce();
  });

  it("returns a completion warning when store refresh fails after import commit", async () => {
    const deps = dependencies();
    vi.mocked(deps.refreshStores).mockRejectedValueOnce(
      new Error("refresh failed"),
    );
    const service = new BackupService(deps);

    const result = await service.importBackup(envelope(), "merge");

    expect(result.settingsPersisted).toBe(true);
    expect(result.warning).toMatch(/refresh/i);
  });

  it("clears replace recents before refresh and warns without rejecting on failure", async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    vi.mocked(deps.clearRecentPatterns).mockImplementationOnce(() => {
      order.push("recents");
      throw new Error("preferences unavailable");
    });
    const service = new BackupService(deps);

    const result = await service.importBackup(envelope(), "replace");

    expect(order).toEqual([
      "export",
      "get-settings",
      "download",
      "import:replace",
      "recents",
      "settings",
      "refresh",
    ]);
    expect(result.warning).toMatch(/recent pattern/i);
  });

  it("backs up, atomically empties the database domain, resets settings, and refreshes", async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    const service = new BackupService(deps);

    const result = await service.clearAllLocalData();

    expect(order).toEqual([
      "export",
      "get-settings",
      "download",
      "import:replace",
      "settings",
      "preferences",
      "refresh",
    ]);
    expect(deps.storage.importSnapshot).toHaveBeenCalledWith(
      emptySnapshot,
      "replace",
    );
    expect(deps.applySettings).toHaveBeenCalledWith({
      guidedPractice: createDefaultGuidedPracticeValues(),
      history: defaultHistorySettings,
      practice: defaultPracticeSettings,
    });
    expect(result.cleared).toBe(true);
  });

  it("does not reject a committed clear when settings, preferences, or refresh fail", async () => {
    const deps = dependencies();
    vi.mocked(deps.applySettings).mockImplementationOnce(() => {
      throw new Error("settings failed");
    });
    vi.mocked(deps.clearAppPreferences).mockImplementationOnce(() => {
      throw new Error("preferences failed");
    });
    vi.mocked(deps.refreshStores).mockRejectedValueOnce(
      new Error("refresh failed"),
    );
    const service = new BackupService(deps);

    const result = await service.clearAllLocalData();

    expect(result).toMatchObject({ cleared: true, settingsPersisted: false });
    expect(result.warning).toMatch(/settings/i);
    expect(result.warning).toMatch(/preferences/i);
    expect(result.warning).toMatch(/refresh/i);
  });

  it("still rejects a clear database failure before commit", async () => {
    const deps = dependencies();
    vi.mocked(deps.storage.importSnapshot).mockRejectedValueOnce(
      new Error("database failed"),
    );
    const service = new BackupService(deps);

    await expect(service.clearAllLocalData()).rejects.toThrow(
      "database failed",
    );
    expect(deps.applySettings).not.toHaveBeenCalled();
    expect(deps.clearAppPreferences).not.toHaveBeenCalled();
    expect(deps.refreshStores).not.toHaveBeenCalled();
  });
});
