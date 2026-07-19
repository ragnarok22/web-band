import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { downloadBackupEnvelope, parseBackupFile } from "@/lib/backup-browser";
import {
  backupFileName,
  createBackupEnvelope,
  defaultBackupPreferences,
  MAX_BACKUP_FILE_BYTES,
} from "@/lib/backup-envelope";
import { createDefaultGuidedPracticeValues } from "@/stores/guided-practice-store";

function envelope() {
  return createBackupEnvelope(
    {
      customChordProgressions: [],
      customPatterns: [],
      customStrummingPatterns: [],
      favoriteChordProgressionIds: [],
      favoritePatternIds: [],
      practicePresets: [],
      practiceSessions: [],
    },
    {
      guidedPractice: createDefaultGuidedPracticeValues(),
      history: { enabled: true, minimumDurationSeconds: 30 },
      practice: structuredClone(defaultPracticeSettings),
    },
    defaultBackupPreferences,
    new Date("2026-07-18T12:00:00.000Z"),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("backup browser adapter", () => {
  it("starts a formatted JSON download and revokes its URL on a later task", () => {
    vi.useFakeTimers();
    let downloadedBlob: Blob | undefined;
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        downloadedBlob = blob;
        return "blob:backup";
      }),
      revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadBackupEnvelope(envelope());

    expect(downloadedBlob?.type).toBe("application/json");
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.instances[0]).toMatchObject({
      download: backupFileName("2026-07-18T12:00:00.000Z"),
      href: "blob:backup",
    });
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup");
    vi.useRealTimers();
  });

  it("rejects an oversized File before reading its contents", async () => {
    const file = {
      name: "too-large.json",
      size: MAX_BACKUP_FILE_BYTES + 1,
      text: vi.fn(),
    } as unknown as File;

    await expect(parseBackupFile(file)).rejects.toThrow(/larger than/i);
    expect(file.text).not.toHaveBeenCalled();
  });
});
