import {
  BackupFileError,
  MAX_BACKUP_FILE_BYTES,
  parseBackupText,
} from "@/lib/backup-envelope";
import type {
  BackupImportWorkerRequest,
  BackupImportWorkerResponse,
} from "@/lib/backup-import-worker-protocol";

const worker = self as unknown as DedicatedWorkerGlobalScope;

worker.onmessage = async (
  event: MessageEvent<BackupImportWorkerRequest>,
): Promise<void> => {
  const { file } = event.data;
  try {
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      throw new BackupFileError("Backup file is larger than the 25 MB limit.");
    }
    const parsed = parseBackupText(await file.text(), file.name);
    worker.postMessage({
      ok: true,
      parsed,
    } satisfies BackupImportWorkerResponse);
  } catch (error) {
    worker.postMessage({
      error:
        error instanceof Error && error.message
          ? error.message
          : "Backup file could not be read.",
      ok: false,
    } satisfies BackupImportWorkerResponse);
  }
};

export {};
