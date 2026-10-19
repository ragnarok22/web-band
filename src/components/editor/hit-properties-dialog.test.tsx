import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { HitPropertiesDialog } from "@/components/editor/hit-properties-dialog";

describe("hit properties labels", () => {
  it.each(["Velocity", "Probability", "Timing offset"])(
    "associates the %s label only with its slider, not its output",
    (name) => {
      render(
        <HitPropertiesDialog
          instrument="kick"
          onClose={vi.fn()}
          onSave={vi.fn()}
          step={0}
        />,
      );
      const slider = screen.getByRole<HTMLInputElement>("slider", { name });

      expect(slider.labels).toHaveLength(1);
      const label = slider.labels!.item(0)!;
      expect(label.control).toBe(slider);
      expect(label.querySelector("output")).toBeNull();
    },
  );

  it("keeps range outputs and submitted hit properties in sync", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <HitPropertiesDialog
        instrument="kick"
        onClose={vi.fn()}
        onSave={onSave}
        step={0}
      />,
    );

    fireEvent.change(screen.getByRole("slider", { name: "Velocity" }), {
      target: { value: "0.85" },
    });
    fireEvent.change(screen.getByRole("slider", { name: "Probability" }), {
      target: { value: "0.6" },
    });
    fireEvent.change(screen.getByRole("slider", { name: "Timing offset" }), {
      target: { value: "0.025" },
    });

    expect(
      screen.getAllByRole("status").map((output) => output.textContent),
    ).toEqual(["0.85", "0.60", "0.025"]);
    await user.click(screen.getByRole("button", { name: "Apply hit" }));
    expect(onSave).toHaveBeenCalledWith({
      flam: false,
      probability: 0.6,
      timingOffset: 0.025,
      velocity: 0.85,
    });
  });
});
