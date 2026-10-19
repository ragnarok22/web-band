import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Slider } from "@/components/ui/slider";

describe("slider", () => {
  it("renders one named thumb for scalar values and updates its value text", () => {
    const changed = vi.fn();
    const committed = vi.fn();
    function ControlledSlider() {
      const [value, setValue] = useState(90);
      return (
        <Slider
          aria-label="Tempo"
          aria-valuetext={`${value} BPM`}
          min={40}
          max={220}
          value={value}
          onValueChange={(next) => {
            setValue(Number(next));
            changed(next);
          }}
          onValueCommitted={committed}
        />
      );
    }
    render(<ControlledSlider />);
    const slider = screen.getByRole("slider", { name: "Tempo" });
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    expect(slider).toHaveAttribute("aria-valuetext", "90 BPM");
    fireEvent.change(slider, { target: { value: "110" } });
    expect(changed).toHaveBeenCalledWith(110);
    expect(committed).toHaveBeenCalled();
    expect(slider).toHaveAttribute("aria-valuetext", "110 BPM");
  });

  it("disables its native range input", () => {
    render(
      <Slider
        aria-label="Master volume"
        value={0.8}
        min={0}
        max={1}
        step={0.01}
        disabled
      />,
    );
    expect(
      screen.getByRole("slider", { name: "Master volume" }),
    ).toBeDisabled();
  });
});
