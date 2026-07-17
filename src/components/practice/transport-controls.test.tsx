import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TransportControls } from "@/components/practice/transport-controls";

describe("transport controls", () => {
  it("starts with Play available and Pause and Stop disabled", () => {
    render(
      <TransportControls
        onPause={vi.fn()}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        status="not-initialized"
      />,
    );

    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Pause playback" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Stop playback" }),
    ).toBeDisabled();
  });

  it("exposes Pause and Stop while the count-in is running", async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    const onStop = vi.fn();
    render(
      <TransportControls
        onPause={onPause}
        onPlay={vi.fn()}
        onStop={onStop}
        status="counting-in"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pause playback" }));
    await user.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(onPause).toHaveBeenCalledOnce();
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("labels Play as Resume after a pause", () => {
    render(
      <TransportControls
        onPause={vi.fn()}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        status="paused"
      />,
    );

    expect(screen.getByRole("button", { name: "Resume" })).toBeEnabled();
  });
});
