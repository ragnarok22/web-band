import { fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  usePracticeShortcuts,
  type BpmAdjustmentStep,
} from "@/hooks/use-practice-shortcuts";

function renderShortcuts({
  adjustmentStep,
  disabled = false,
}: {
  adjustmentStep: BpmAdjustmentStep;
  disabled?: boolean;
}) {
  const callbacks = {
    onBpmChange: vi.fn(),
    onFocusToggle: vi.fn(),
    onMasterMuteToggle: vi.fn(),
    onPatternChange: vi.fn(),
    onPause: vi.fn(),
    onPlay: vi.fn(),
    onStop: vi.fn(),
    onTapTempo: vi.fn(),
  };

  renderHook(() =>
    usePracticeShortcuts({
      adjustmentStep,
      disabled,
      ...callbacks,
      status: "stopped",
    }),
  );

  return callbacks;
}

describe("usePracticeShortcuts", () => {
  it.each([
    { adjustmentStep: 1 as const, alternateStep: 5 },
    { adjustmentStep: 5 as const, alternateStep: 1 },
  ])(
    "uses $adjustmentStep BPM for plain arrows and $alternateStep BPM for Shift arrows",
    ({ adjustmentStep, alternateStep }) => {
      const { onBpmChange } = renderShortcuts({ adjustmentStep });

      fireEvent.keyDown(window, { key: "ArrowUp" });
      fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true });

      expect(onBpmChange).toHaveBeenNthCalledWith(1, adjustmentStep);
      expect(onBpmChange).toHaveBeenNthCalledWith(2, -alternateStep);
    },
  );

  it("reports relative deltas for tempo-trainer callbacks", () => {
    let trainerStartBpm = 100;
    const { onBpmChange } = renderShortcuts({ adjustmentStep: 5 });
    onBpmChange.mockImplementation((amount) => {
      trainerStartBpm += amount;
    });

    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true });

    expect(trainerStartBpm).toBe(104);
    expect(onBpmChange.mock.calls).toEqual([[5], [-1]]);
  });

  it("ignores shortcuts from editable targets", () => {
    const { onBpmChange, onTapTempo } = renderShortcuts({ adjustmentStep: 5 });
    const input = document.createElement("input");
    document.body.append(input);

    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "t" });
    input.remove();

    expect(onBpmChange).not.toHaveBeenCalled();
    expect(onTapTempo).not.toHaveBeenCalled();
  });

  it("ignores shortcuts while a modal disables them", () => {
    const { onBpmChange, onPlay } = renderShortcuts({
      adjustmentStep: 5,
      disabled: true,
    });

    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { code: "Space", key: " " });

    expect(onBpmChange).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });

  it.each(["altKey", "ctrlKey", "metaKey"] as const)(
    "ignores arrow shortcuts with the %s modifier",
    (modifier) => {
      const { onBpmChange } = renderShortcuts({ adjustmentStep: 5 });

      fireEvent.keyDown(window, { key: "ArrowUp", [modifier]: true });

      expect(onBpmChange).not.toHaveBeenCalled();
    },
  );

  it("reserves Shift for arrow shortcuts", () => {
    const { onFocusToggle, onMasterMuteToggle, onTapTempo } = renderShortcuts({
      adjustmentStep: 5,
    });

    fireEvent.keyDown(window, { key: "t", shiftKey: true });
    fireEvent.keyDown(window, { key: "f", shiftKey: true });
    fireEvent.keyDown(window, { key: "m", shiftKey: true });

    expect(onTapTempo).not.toHaveBeenCalled();
    expect(onFocusToggle).not.toHaveBeenCalled();
    expect(onMasterMuteToggle).not.toHaveBeenCalled();
  });
});
