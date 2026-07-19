import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultHistorySettings } from "@/db/repositories/history-settings-repository";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import {
  createBackupEnvelope,
  defaultBackupPreferences,
} from "@/lib/backup-envelope";
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
    defaultBackupPreferences,
    new Date("2026-07-18T12:00:00.000Z"),
  );
}

function dependencies(order: string[] = []): BackupServiceDependencies {
  return {
    applyPreferences: vi.fn(() => {
      order.push("apply-preferences");
      return true;
    }),
    applySettings: vi.fn(() => {
      order.push("settings");
      return true;
    }),
    clearAppPreferences: vi.fn(() => {
      order.push("clear-keys");
      return true;
    }),
    downloadEnvelope: vi.fn(() => order.push("download")),
    executeStorageOperation: vi.fn(async (operation) => operation()),
    flushPendingHistory: vi.fn(async () => {
      order.push("flush");
    }),
    getPreferences: vi.fn(() => {
      order.push("get-preferences");
      return structuredClone(defaultBackupPreferences);
    }),
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

    expect(order).toEqual([
      "flush",
      "import:merge",
      "settings",
      "apply-preferences",
      "refresh",
    ]);
    expect(deps.storage.importSnapshot).toHaveBeenCalledWith(
      emptySnapshot,
      "merge",
    );
    expect(deps.applySettings).toHaveBeenCalledWith(envelope().data.settings);
    expect(deps.applyPreferences).toHaveBeenCalledWith(
      envelope().data.preferences,
    );
    expect(result).toMatchObject({ mode: "merge", settingsPersisted: true });
  });

  it("normalizes version 1 settings while preserving merge preferences", async () => {
    const current = envelope();
    const legacyPractice = structuredClone(
      current.data.settings.practice,
    ) as unknown as Record<string, unknown>;
    delete legacyPractice.soundCharacter;
    delete legacyPractice.bpmAdjustmentStep;
    delete legacyPractice.restoreLastPractice;
    const legacy = {
      ...current,
      data: structuredClone(current.data) as unknown as Record<string, unknown>,
      version: 1,
    };
    delete legacy.data.preferences;
    const legacySettings = legacy.data.settings as Record<string, unknown>;
    legacySettings.practice = legacyPractice;
    const deps = dependencies();
    const service = new BackupService(deps);

    await service.importBackup(legacy, "merge");

    expect(deps.applySettings).toHaveBeenCalledWith(
      expect.objectContaining({
        practice: expect.objectContaining({ soundCharacter: "balanced" }),
      }),
    );
    expect(deps.applyPreferences).not.toHaveBeenCalled();

    await service.importBackup(legacy, "replace");
    expect(deps.applyPreferences).toHaveBeenCalledWith(
      defaultBackupPreferences,
    );
  });

  it("downloads a current backup before a replace mutation", async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    const service = new BackupService(deps);

    await service.importBackup(envelope(), "replace");

    expect(order).toEqual([
      "flush",
      "export",
      "get-settings",
      "get-preferences",
      "download",
      "import:replace",
      "settings",
      "apply-preferences",
      "refresh",
    ]);
    expect(deps.downloadEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ app: "web-band", version: 4 }),
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
    expect(deps.applyPreferences).not.toHaveBeenCalled();
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

  it("returns a completion warning when preferences fail after import commit", async () => {
    const deps = dependencies();
    vi.mocked(deps.applyPreferences).mockReturnValueOnce(false);
    const service = new BackupService(deps);

    const result = await service.importBackup(envelope(), "merge");

    expect(result.settingsPersisted).toBe(false);
    expect(result.warning).toMatch(/preferences/i);
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

  it("applies imported preferences before refreshing stores", async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    const service = new BackupService(deps);

    const result = await service.importBackup(envelope(), "replace");

    expect(order).toEqual([
      "flush",
      "export",
      "get-settings",
      "get-preferences",
      "download",
      "import:replace",
      "settings",
      "apply-preferences",
      "refresh",
    ]);
    expect(result.warning).toBeNull();
  });

  it("backs up, atomically empties the database domain, resets settings, and refreshes", async () => {
    const order: string[] = [];
    const deps = dependencies(order);
    const service = new BackupService(deps);

    const result = await service.clearAllLocalData();

    expect(order).toEqual([
      "flush",
      "export",
      "get-settings",
      "get-preferences",
      "download",
      "import:replace",
      "settings",
      "apply-preferences",
      "clear-keys",
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
    expect(deps.applyPreferences).toHaveBeenCalledWith(
      defaultBackupPreferences,
    );
    expect(result.cleared).toBe(true);
  });

  it("resets settings without reading or mutating the database", () => {
    const deps = dependencies();
    const service = new BackupService(deps);

    const result = service.resetSettings();

    expect(deps.applySettings).toHaveBeenCalledWith({
      guidedPractice: createDefaultGuidedPracticeValues(),
      history: defaultHistorySettings,
      practice: defaultPracticeSettings,
    });
    expect(deps.applyPreferences).toHaveBeenCalledWith(
      defaultBackupPreferences,
    );
    expect(deps.storage.exportSnapshot).not.toHaveBeenCalled();
    expect(deps.storage.importSnapshot).not.toHaveBeenCalled();
    expect(result).toEqual({
      reset: true,
      settingsPersisted: true,
      warning: null,
    });
  });

  it("waits for queued history writes before exporting", async () => {
    const deps = dependencies();
    let releaseHistory: () => void = () => undefined;
    vi.mocked(deps.flushPendingHistory).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseHistory = resolve;
        }),
    );
    const service = new BackupService(deps);

    const backupPromise = service.createCurrentBackup();
    await Promise.resolve();
    expect(deps.storage.exportSnapshot).not.toHaveBeenCalled();

    releaseHistory();
    await backupPromise;
    expect(deps.storage.exportSnapshot).toHaveBeenCalledOnce();
  });

  it("aborts deletion when its generated safety backup is invalid", async () => {
    const deps = dependencies();
    vi.mocked(deps.storage.exportSnapshot).mockResolvedValueOnce({
      ...structuredClone(emptySnapshot),
      favoritePatternIds: ["missing-pattern"],
    });
    const service = new BackupService(deps);

    await expect(service.clearAllLocalData()).rejects.toThrow(
      /valid Web Band backup/i,
    );
    expect(deps.downloadEnvelope).not.toHaveBeenCalled();
    expect(deps.storage.importSnapshot).not.toHaveBeenCalled();
  });

  it("does not reject a committed clear when settings, preferences, or refresh fail", async () => {
    const deps = dependencies();
    vi.mocked(deps.applySettings).mockImplementationOnce(() => {
      throw new Error("settings failed");
    });
    vi.mocked(deps.applyPreferences).mockImplementationOnce(() => {
      throw new Error("preference reset failed");
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
    expect(deps.applyPreferences).not.toHaveBeenCalled();
    expect(deps.clearAppPreferences).not.toHaveBeenCalled();
    expect(deps.refreshStores).not.toHaveBeenCalled();
  });
});
