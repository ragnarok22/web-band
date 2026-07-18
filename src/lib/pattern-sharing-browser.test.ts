import { afterEach, describe, expect, it, vi } from "vitest";

import { createPatternShareEnvelope } from "@/lib/pattern-sharing";
import {
  downloadPatternShareEnvelope,
  parsePatternShareFile,
} from "@/lib/pattern-sharing-browser";
import { MAX_PATTERN_SHARE_FILE_BYTES } from "@/lib/pattern-sharing";
import type { CustomDrumPattern } from "@/types/persistence";

const pattern: CustomDrumPattern = {
  bars: 1,
  category: "funk",
  createdAt: "2026-07-18T12:00:00.000Z",
  defaultBpm: 100,
  description: "Share me.",
  difficulty: "intermediate",
  hits: [],
  id: "share-me",
  isBuiltIn: false,
  name: "Share Me",
  recommendedBpmRange: { max: 130, min: 80 },
  subdivision: 16,
  timeSignature: { denominator: 4, numerator: 4 },
  updatedAt: "2026-07-18T12:00:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("pattern sharing browser adapter", () => {
  it("downloads JSON with a pattern-specific filename", () => {
    vi.useFakeTimers();
    let downloadedBlob: Blob | undefined;
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        downloadedBlob = blob;
        return "blob:pattern";
      }),
      revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    downloadPatternShareEnvelope(createPatternShareEnvelope([pattern]));

    expect(downloadedBlob?.type).toBe("application/json");
    expect(click.mock.instances[0]).toMatchObject({
      download: "web-band-pattern-share-me.json",
      href: "blob:pattern",
    });
    vi.runOnlyPendingTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:pattern");
  });

  it("rejects an oversized file before reading it", async () => {
    const file = {
      name: "too-large.json",
      size: MAX_PATTERN_SHARE_FILE_BYTES + 1,
      text: vi.fn(),
    } as unknown as File;

    await expect(parsePatternShareFile(file)).rejects.toThrow(/larger than/i);
    expect(file.text).not.toHaveBeenCalled();
  });
});
