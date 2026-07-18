import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PatternExportButton } from "@/components/patterns/pattern-export-button";
import { basicRockPattern } from "@/data/patterns";
import type { CustomDrumPattern } from "@/types/persistence";

const downloadPatternShareEnvelope = vi.hoisted(() => vi.fn());

vi.mock("@/lib/pattern-sharing-browser", () => ({
  downloadPatternShareEnvelope,
}));

const pattern: CustomDrumPattern = {
  ...structuredClone(basicRockPattern),
  createdAt: "2026-07-18T10:00:00.000Z",
  id: "custom-basic-rock",
  isBuiltIn: false,
  updatedAt: "2026-07-18T10:00:00.000Z",
};

describe("pattern export button", () => {
  it("announces a recovery action when the download fails", async () => {
    const user = userEvent.setup();
    downloadPatternShareEnvelope.mockImplementationOnce(() => {
      throw new Error("Download blocked");
    });
    render(<PatternExportButton pattern={pattern} />);

    await user.click(
      screen.getByRole("button", { name: `Export ${pattern.name} pattern` }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your browser download permissions and try again.",
    );
  });
});
