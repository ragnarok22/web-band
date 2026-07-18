export function cloneValidRecords<RecordType>(
  records: readonly unknown[],
  isValid: (record: unknown) => record is RecordType,
): RecordType[] {
  const validRecords: RecordType[] = [];
  for (const record of records) {
    if (isValid(record)) validRecords.push(structuredClone(record));
  }
  return validRecords;
}
