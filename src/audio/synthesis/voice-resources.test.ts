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

  it("keeps a source connected until a scheduled stop is delivered", () => {
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

    (resources.stop as (time?: number) => void)(4.25);

    expect(source.stop).toHaveBeenCalledWith(4.25);
    expect(cleanup).not.toHaveBeenCalled();
    onEnded();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("keeps the earliest scheduled stop for a tracked source", () => {
    const source = {
      addEventListener: vi.fn(),
      stop: vi.fn(),
    } as unknown as AudioScheduledSourceNode;
    const resources = new VoiceResources();
    resources.track(source, vi.fn());

    resources.stop(4.25);
    resources.stop(5);

    expect(source.stop).toHaveBeenCalledOnce();
    expect(source.stop).toHaveBeenCalledWith(4.25);
  });
});
