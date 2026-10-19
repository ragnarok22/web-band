import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GrooveControls } from "@/components/practice/groove-controls";

describe("groove controls labels", () => {
  it.each(["Swing", "Human touch"])(
    "associates the %s label only with its slider, not its output",
    (name) => {
      render(
        <GrooveControls
          fillFrequency={null}
          humanization={0.1}
          onFillFrequencyChange={vi.fn()}
          onHumanizationChange={vi.fn()}
          onSwingChange={vi.fn()}
          swing={0.25}
        />,
      );
      const slider = screen.getByRole<HTMLInputElement>("slider", {
        name: new RegExp(name),
      });

      expect(slider.labels).toHaveLength(1);
      const label = slider.labels!.item(0)!;
      expect(label.control).toBe(slider);
      expect(label.querySelector("output")).toBeNull();
      expect(slider).toHaveAccessibleName(name);
    },
  );

  it("preserves slider callbacks, output values, and disabled state", () => {
    const onSwingChange = vi.fn();
    const onHumanizationChange = vi.fn();
    const props = {
      fillFrequency: null,
      humanization: 0.1,
      onFillFrequencyChange: vi.fn(),
      onHumanizationChange,
      onSwingChange,
      swing: 0.25,
    };
    const { rerender } = render(<GrooveControls {...props} />);
    const swing = screen.getByRole("slider", { name: /Swing/ });
    const humanization = screen.getByRole("slider", { name: /Human touch/ });

    fireEvent.change(swing, { target: { value: "0.4" } });
    fireEvent.change(humanization, { target: { value: "0.3" } });
    expect(onSwingChange).toHaveBeenCalledWith(0.4);
    expect(onHumanizationChange).toHaveBeenCalledWith(0.3);

    rerender(
      <GrooveControls {...props} disabled humanization={0.3} swing={0.4} />,
    );
    expect(
      screen.getAllByRole("status").map((output) => output.textContent),
    ).toEqual(["40%", "30%"]);
    expect(swing).toBeDisabled();
    expect(humanization).toBeDisabled();
  });
});
