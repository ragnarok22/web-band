import {
  backupFileName,
  MAX_BACKUP_FILE_BYTES,
  parseBackupText,
  serializeBackupEnvelope,
  BackupFileError,
  type BackupPreview,
} from "@/lib/backup-envelope";
import type { BackupEnvelope } from "@/types/persistence";

export async function parseBackupFile(file: File): Promise<BackupPreview> {
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    throw new BackupFileError("Backup file is larger than the 25 MB limit.");
  }
  return parseBackupText(await file.text(), file.name);
}

export function downloadBackupEnvelope(envelope: BackupEnvelope): void {
  const blob = new Blob([serializeBackupEnvelope(envelope)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = backupFileName(envelope.exportedAt);
  anchor.href = url;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
