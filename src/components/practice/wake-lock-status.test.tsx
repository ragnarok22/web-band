import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WakeLockStatusMessage } from "@/components/practice/wake-lock-status";

describe("Wake Lock status message", () => {
  it.each([
    ["unsupported" as const, "This browser cannot keep the screen awake."],
    ["error" as const, "The screen could not be kept awake."],
  ])("shows a nonblocking %s message", (status, message) => {
    render(<WakeLockStatusMessage status={status} />);

    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  it("stays hidden when Wake Lock does not need attention", () => {
    render(<WakeLockStatusMessage status="active" />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
