import type { WebBandDatabase } from "@/db/database";
import type { ImportMode, PersistenceSnapshot } from "@/types/persistence";

export async function importIntoDatabase(
  database: WebBandDatabase,
  snapshot: PersistenceSnapshot,
  mode: ImportMode,
): Promise<void> {
  await database.transaction(
    "rw",
    [
      database.customPatterns,
      database.favoritePatterns,
      database.chordProgressions,
      database.favoriteChordProgressions,
      database.strummingPatterns,
      database.practicePresets,
      database.practiceSessions,
    ],
    async () => {
      if (mode === "replace") {
        await database.customPatterns.clear();
        await database.favoritePatterns.clear();
        await database.chordProgressions.clear();
        await database.favoriteChordProgressions.clear();
        await database.strummingPatterns.clear();
        await database.practicePresets.clear();
        await database.practiceSessions.clear();
      }
      const importedAt = new Date().toISOString();
      if (snapshot.customPatterns.length)
        await database.customPatterns.bulkPut(snapshot.customPatterns);
      if (snapshot.favoritePatternIds.length) {
        await database.favoritePatterns.bulkPut(
          snapshot.favoritePatternIds.map((patternId) => ({
            createdAt: importedAt,
            patternId,
          })),
        );
      }
      if (snapshot.customChordProgressions.length)
        await database.chordProgressions.bulkPut(
          snapshot.customChordProgressions,
        );
      if (snapshot.favoriteChordProgressionIds.length) {
        await database.favoriteChordProgressions.bulkPut(
          snapshot.favoriteChordProgressionIds.map((progressionId) => ({
            createdAt: importedAt,
            progressionId,
          })),
        );
      }
      if (snapshot.customStrummingPatterns.length)
        await database.strummingPatterns.bulkPut(
          snapshot.customStrummingPatterns,
        );
      if (snapshot.practicePresets.length)
        await database.practicePresets.bulkPut(snapshot.practicePresets);
      if (snapshot.practiceSessions.length)
        await database.practiceSessions.bulkPut(snapshot.practiceSessions);
    },
  );
}
