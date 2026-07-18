import { downloadTextFile, readTextFile } from "@/lib/browser-file";
import {
  MAX_PATTERN_SHARE_FILE_BYTES,
  parsePatternShareText,
  patternShareFileName,
  serializePatternShareEnvelope,
  PatternShareFileError,
} from "@/lib/pattern-sharing";
import type {
  PatternShareEnvelope,
  PatternSharePreview,
} from "@/types/pattern-sharing";

export async function parsePatternShareFile(
  file: File,
): Promise<PatternSharePreview> {
  const text = await readTextFile(
    file,
    MAX_PATTERN_SHARE_FILE_BYTES,
    "Pattern file is larger than the 10 MB limit.",
  ).catch((error: unknown) => {
    throw error instanceof PatternShareFileError
      ? error
      : new PatternShareFileError(
          error instanceof Error
            ? error.message
            : "Pattern file could not be read.",
        );
  });
  return parsePatternShareText(text, file.name);
}

export function downloadPatternShareEnvelope(
  envelope: PatternShareEnvelope,
): void {
  downloadTextFile(
    serializePatternShareEnvelope(envelope),
    patternShareFileName(envelope),
    "application/json",
  );
}
