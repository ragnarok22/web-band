import { storageService } from "@/db/storage-service";
import { useStorageStore } from "@/stores/storage-store";

function publishStorageStatus(): void {
  const { mode, warning } = storageService.currentStatus;
  useStorageStore.getState().setStorageStatus(mode, warning);
}

export async function executeStorageOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  await storageService.initialize();
  publishStorageStatus();
  const startedInIndexedDb = storageService.currentStatus.mode === "indexed-db";

  try {
    return await operation();
  } catch (error) {
    if (!startedInIndexedDb) throw error;
    await storageService.recoverFromIndexedDbFailure();
    publishStorageStatus();
    return operation();
  }
}
