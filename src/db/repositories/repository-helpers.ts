export const indexedDbCollections = [
  "customPatterns",
  "favoritePatterns",
  "chordProgressions",
  "favoriteChordProgressions",
  "strummingPatterns",
  "practicePresets",
  "practiceSessions",
] as const;

export type IndexedDbCollection = (typeof indexedDbCollections)[number];
export type CorruptRowCounts = Partial<Record<IndexedDbCollection, number>>;
export type ReportCorruptRows = (count: number) => void;

export function cloneValidRecords<RecordType>(
  records: readonly unknown[],
  isValid: (record: unknown) => record is RecordType,
  reportCorruptRows?: ReportCorruptRows,
): RecordType[] {
  const validRecords: RecordType[] = [];
  for (const record of records) {
    if (isValid(record)) validRecords.push(structuredClone(record));
  }
  reportCorruptRows?.(records.length - validRecords.length);
  return validRecords;
}
