import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import {
  downloadBackupEnvelope,
  getPreparedBackup,
  parseBackupFile,
} from "@/lib/backup-browser";
import {
  backupFileName,
  createBackupEnvelope,
  defaultBackupPreferences,
  MAX_BACKUP_FILE_BYTES,
  parseBackupText,
  serializeBackupEnvelope,
} from "@/lib/backup-envelope";
import type { BackupImportWorkerResponse } from "@/lib/backup-import-worker-protocol";
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

class FakeWorker {
  static instances: FakeWorker[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage:
    ((event: MessageEvent<BackupImportWorkerResponse>) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    FakeWorker.instances.push(this);
  }
}

function installWorker(): void {
  FakeWorker.instances = [];
  vi.stubGlobal("Worker", FakeWorker);
}

afterEach(() => {
  vi.useRealTimers();
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
    installWorker();
    const file = {
      name: "too-large.json",
      size: MAX_BACKUP_FILE_BYTES + 1,
      text: vi.fn(),
    } as unknown as File;

    await expect(parseBackupFile(file)).rejects.toThrow(/larger than/i);
    expect(file.text).not.toHaveBeenCalled();
    expect(FakeWorker.instances).toHaveLength(0);
  });

  it("posts the File to a worker and returns an opaque prepared preview", async () => {
    installWorker();
    const file = new File(["worker-owned"], "backup.json", {
      type: "application/json",
    });
    const text = serializeBackupEnvelope(envelope());
    const textSpy = vi.fn();
    Object.defineProperty(file, "text", { value: textSpy });

    const previewPromise = parseBackupFile(file);
    const worker = FakeWorker.instances[0]!;
    expect(worker.postMessage).toHaveBeenCalledWith({ file });
    expect(textSpy).not.toHaveBeenCalled();
    worker.onmessage?.(
      new MessageEvent("message", {
        data: { ok: true, parsed: parseBackupText(text, file.name) },
      }),
    );

    const preview = await previewPromise;
    expect(preview).toMatchObject({
      fileName: "backup.json",
      sourceVersion: 4,
      totalRecords: 0,
    });
    expect(preview).not.toHaveProperty("envelope");
    expect(getPreparedBackup(preview)).toEqual({
      envelope: envelope(),
      sourceVersion: 4,
    });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("reconstructs worker validation failures and terminates once", async () => {
    installWorker();
    const file = new File(["invalid"], "invalid.json");
    const previewPromise = parseBackupFile(file);
    const worker = FakeWorker.instances[0]!;

    worker.onmessage?.(
      new MessageEvent("message", {
        data: { error: "This file is not valid JSON.", ok: false },
      }),
    );
    worker.onmessage?.(
      new MessageEvent("message", {
        data: { error: "Late duplicate error.", ok: false },
      }),
    );

    await expect(previewPromise).rejects.toThrow(
      "This file is not valid JSON.",
    );
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it("turns worker runtime errors into a safe read failure", async () => {
    installWorker();
    const previewPromise = parseBackupFile(new File(["backup"], "backup.json"));
    const worker = FakeWorker.instances[0]!;

    worker.onerror?.(new ErrorEvent("error"));

    await expect(previewPromise).rejects.toThrow(
      "Backup file could not be read.",
    );
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
