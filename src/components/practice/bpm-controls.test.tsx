import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BpmControls } from "@/components/practice/bpm-controls";

describe("BPM controls", () => {
  it("supports one- and five-BPM adjustments", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BpmControls
        bpm={90}
        defaultBpm={90}
        onChange={onChange}
        onTap={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Increase BPM by 5" }));
    await user.click(screen.getByRole("button", { name: "Decrease BPM by 1" }));

    expect(onChange).toHaveBeenNthCalledWith(1, 95);
    expect(onChange).toHaveBeenNthCalledWith(2, 89);
  });

  it("commits numeric input and slider changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BpmControls
        bpm={90}
        defaultBpm={90}
        onChange={onChange}
        onTap={vi.fn()}
      />,
    );
    const numericInput = screen.getByRole("spinbutton", {
      name: "Current BPM",
    });

    await user.clear(numericInput);
    await user.type(numericInput, "132");
    fireEvent.blur(numericInput);
    fireEvent.change(screen.getByRole("slider", { name: "Tempo" }), {
      target: { value: "145" },
    });

    expect(onChange).toHaveBeenCalledWith(132);
    expect(onChange).toHaveBeenCalledWith(145);
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
});
