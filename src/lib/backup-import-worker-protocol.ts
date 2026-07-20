import type { ParsedBackup } from "@/lib/backup-envelope";

export interface BackupImportWorkerRequest {
  file: File;
}

export type BackupImportWorkerResponse =
  { ok: true; parsed: ParsedBackup } | { error: string; ok: false };
