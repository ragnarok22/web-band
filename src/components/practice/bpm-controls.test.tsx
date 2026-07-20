import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { BpmControls } from "@/components/practice/bpm-controls";
import type { BpmAdjustmentStep } from "@/hooks/use-practice-shortcuts";

function ControlledBpmControls({
  adjustmentStep = 1,
  defaultBpm = 90,
  onChange = vi.fn(),
  onCommit = vi.fn(),
}: {
  adjustmentStep?: BpmAdjustmentStep;
  defaultBpm?: number;
  onChange?: (bpm: number) => void;
  onCommit?: (bpm: number) => void;
}) {
  const [bpm, setBpm] = useState(90);

  return (
    <BpmControls
      adjustmentStep={adjustmentStep}
      bpm={bpm}
      defaultBpm={defaultBpm}
      onChange={(nextBpm) => {
        setBpm(nextBpm);
        onChange(nextBpm);
      }}
      onCommit={onCommit}
      onTap={vi.fn()}
    />
  );
}

describe("BPM controls", () => {
  it("applies sequential one- and five-BPM adjustments to the current value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(<ControlledBpmControls onChange={onChange} onCommit={onCommit} />);

    await user.click(screen.getByRole("button", { name: "Increase BPM by 5" }));
    await user.click(screen.getByRole("button", { name: "Decrease BPM by 1" }));

    expect(onChange).toHaveBeenNthCalledWith(1, 95);
    expect(onChange).toHaveBeenNthCalledWith(2, 94);
    expect(onCommit).toHaveBeenNthCalledWith(1, 95);
    expect(onCommit).toHaveBeenNthCalledWith(2, 94);
    expect(screen.getByRole("spinbutton", { name: "Current BPM" })).toHaveValue(
      94,
    );
  });

  it.each([
    { adjustmentStep: 1 as const, order: [-1, 1, -5, 5] },
    { adjustmentStep: 5 as const, order: [-5, 5, -1, 1] },
  ])(
    "orders and marks the $adjustmentStep BPM default pair while retaining every adjustment",
    ({ adjustmentStep, order }) => {
      render(<ControlledBpmControls adjustmentStep={adjustmentStep} />);
      const group = screen.getByRole("group", { name: "BPM adjustments" });
      const buttons = within(group).getAllByRole("button");

      expect(buttons.map((button) => Number(button.textContent))).toEqual(
        order,
      );
      expect(
        buttons
          .filter(
            (button) =>
              button.getAttribute("data-default-adjustment") === "true",
          )
          .map((button) => Math.abs(Number(button.textContent))),
      ).toEqual([adjustmentStep, adjustmentStep]);
      expect(
        within(group).getByRole("button", { name: "Decrease BPM by 5" }),
      ).toBeVisible();
      expect(
        within(group).getByRole("button", { name: "Decrease BPM by 1" }),
      ).toBeVisible();
      expect(
        within(group).getByRole("button", { name: "Increase BPM by 1" }),
      ).toBeVisible();
      expect(
        within(group).getByRole("button", { name: "Increase BPM by 5" }),
      ).toBeVisible();
    },
  );

  it("commits numeric input and slider changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(<ControlledBpmControls onChange={onChange} onCommit={onCommit} />);
    const numericInput = screen.getByRole("spinbutton", {
      name: "Current BPM",
    });

    await user.clear(numericInput);
    await user.type(numericInput, "132");
    fireEvent.blur(numericInput);
    expect(onCommit).toHaveBeenCalledWith(132);
    onCommit.mockClear();

    const slider = screen.getByRole("slider", { name: "Tempo" });
    fireEvent.change(slider, {
      target: { value: "145" },
    });

    expect(onChange).toHaveBeenCalledWith(132);
    expect(onChange).toHaveBeenCalledWith(145);
    expect(onCommit).not.toHaveBeenCalled();
    expect(slider).toHaveAttribute("aria-valuetext", "145 BPM");

    fireEvent.pointerUp(slider);
    expect(onCommit).toHaveBeenCalledWith(145);
  });

  it("supports tap tempo", async () => {
    const user = userEvent.setup();
    const onTap = vi.fn();
    render(
      <BpmControls bpm={90} defaultBpm={90} onChange={vi.fn()} onTap={onTap} />,
    );

    await user.click(screen.getByRole("button", { name: /Tap tempo/ }));

    expect(onTap).toHaveBeenCalledOnce();
  });

  it("resets to the exact pattern default", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ControlledBpmControls defaultBpm={118} onChange={onChange} />);

    await user.click(
      screen.getByRole("button", { name: "Reset tempo to 118 BPM" }),
    );

    expect(onChange).toHaveBeenCalledWith(118);
    expect(screen.getByRole("spinbutton", { name: "Current BPM" })).toHaveValue(
      118,
    );
  });
});
