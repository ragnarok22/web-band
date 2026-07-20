import {
  backupFileName,
  MAX_BACKUP_FILE_BYTES,
  serializeBackupEnvelope,
  BackupFileError,
  type BackupPreview,
  type ParsedBackup,
} from "@/lib/backup-envelope";
import type { BackupImportWorkerResponse } from "@/lib/backup-import-worker-protocol";
import { downloadTextFile } from "@/lib/browser-file";
import type { BackupEnvelope } from "@/types/persistence";

interface PreparedBackup {
  envelope: BackupEnvelope;
  sourceVersion: 1 | 2 | 3 | 4;
}

const preparedBackups = new WeakMap<object, PreparedBackup>();

function createPreparedPreview(parsed: ParsedBackup): BackupPreview {
  const { envelope, ...preview } = parsed;
  const token = Object.freeze(preview);
  preparedBackups.set(token, {
    envelope,
    sourceVersion: preview.sourceVersion,
  });
  return token;
}

export function getPreparedBackup(value: unknown): PreparedBackup | null {
  if (typeof value !== "object" || value === null) return null;
  return preparedBackups.get(value) ?? null;
}

export async function parseBackupFile(file: File): Promise<BackupPreview> {
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    throw new BackupFileError("Backup file is larger than the 25 MB limit.");
  }

  return new Promise<BackupPreview>((resolve, reject) => {
    let settled = false;
    let worker: Worker;
    const finish = (result: BackupPreview | BackupFileError): void => {
      if (settled) return;
      settled = true;
      worker.terminate();
      if (result instanceof BackupFileError) reject(result);
      else resolve(result);
    };

    try {
      worker = new Worker(
        new URL("./backup-import.worker.ts", import.meta.url),
      );
    } catch {
      reject(new BackupFileError("Backup file could not be read."));
      return;
    }
    worker.onmessage = (
      event: MessageEvent<BackupImportWorkerResponse>,
    ): void => {
      const response = event.data;
      finish(
        response.ok
          ? createPreparedPreview(response.parsed)
          : new BackupFileError(response.error),
      );
    };
    worker.onerror = () =>
      finish(new BackupFileError("Backup file could not be read."));
    worker.onmessageerror = () =>
      finish(new BackupFileError("Backup file could not be read."));
    try {
      worker.postMessage({ file });
    } catch {
      finish(new BackupFileError("Backup file could not be read."));
    }
  });
}

export function downloadBackupEnvelope(envelope: BackupEnvelope): void {
  downloadTextFile(
    serializeBackupEnvelope(envelope),
    backupFileName(envelope.exportedAt),
    "application/json",
  );
}
