import { describe, expect, it, vi } from "vitest";

import { VoiceResources } from "@/audio/synthesis/voice-resources";

describe("voice resources", () => {
  it("runs cleanup when actively stopping a tracked source", () => {
    let onEnded: () => void = () => undefined;
    const source = {
      addEventListener: vi.fn(
        (_event: string, listener: () => void) => void (onEnded = listener),
      ),
      stop: vi.fn(),
    } as unknown as AudioScheduledSourceNode;
    const cleanup = vi.fn();
    const resources = new VoiceResources();
    resources.track(source, cleanup);

    resources.stop();
    onEnded();

    expect(source.stop).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
