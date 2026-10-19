import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TransportControls } from "@/components/practice/transport-controls";
import { renderWithMotion as render } from "@/test/render-with-motion";

describe("transport controls", () => {
  it("starts with Play available and Pause and Stop disabled", () => {
    render(
      <TransportControls
        onFinish={vi.fn()}
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
    expect(
      screen.queryByRole("button", { name: "Finish with fill" }),
    ).not.toBeInTheDocument();
  });

  it("exposes Pause and Stop while the count-in is running", async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    const onFinish = vi.fn();
    const onStop = vi.fn();
    render(
      <TransportControls
        onFinish={onFinish}
        onPause={onPause}
        onPlay={vi.fn()}
        onStop={onStop}
        status="counting-in"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Pause playback" }));
    await user.click(screen.getByRole("button", { name: "Finish with fill" }));
    await user.click(screen.getByRole("button", { name: "Stop playback" }));
    expect(onPause).toHaveBeenCalledOnce();
    expect(onFinish).toHaveBeenCalledOnce();
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("labels Play as Resume after a pause", () => {
    render(
      <TransportControls
        onFinish={vi.fn()}
        onPause={vi.fn()}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        status="paused"
      />,
    );

    expect(screen.getByRole("button", { name: "Resume" })).toBeEnabled();
  });

  it("communicates loading while keeping immediate Stop available", () => {
    render(
      <TransportControls
        onFinish={vi.fn()}
        onPause={vi.fn()}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        status="initializing"
      />,
    );
    const play = screen.getByRole("button", { name: "Play" });
    expect(play).toBeDisabled();
    expect(play).toHaveAttribute("aria-busy", "true");
    expect(play).toHaveAccessibleDescription("Starting the audio engine.");
    expect(screen.getByRole("button", { name: "Stop playback" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Pause playback" }),
    ).toHaveAccessibleDescription("Start playback to enable Pause.");
  });

  it("explains when inactive controls become available", () => {
    render(
      <TransportControls
        onFinish={vi.fn()}
        onPause={vi.fn()}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        status="ready"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Stop playback" }),
    ).toHaveAccessibleDescription("Start playback to enable Stop.");
    expect(
      screen.getByRole("button", { name: "Pause playback" }),
    ).toHaveAccessibleDescription("Start playback to enable Pause.");
  });

  it("keeps the primary control mounted and focused across play states", () => {
    const callbacks = {
      onFinish: vi.fn(),
      onPause: vi.fn(),
      onPlay: vi.fn(),
      onStop: vi.fn(),
    };
    const { rerender } = render(
      <TransportControls {...callbacks} status="not-initialized" />,
    );
    const playButton = screen.getByRole("button", { name: "Play" });
    playButton.focus();

    rerender(<TransportControls {...callbacks} status="playing" />);

    expect(screen.getByRole("button", { name: "Finish with fill" })).toBe(
      playButton,
    );
    expect(playButton).toHaveFocus();
  });
});
