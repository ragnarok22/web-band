import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PatternActionsMenu } from "@/components/patterns/pattern-actions-menu";
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

describe("pattern actions menu", () => {
  it("only offers duplication for built-in patterns and restores keyboard focus", async () => {
    const user = userEvent.setup();
    render(<PatternActionsMenu pattern={basicRockPattern} />);
    const trigger = screen.getByRole("button", {
      name: "More actions for Basic Rock",
    });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "Duplicate Basic Rock" }),
    ).toHaveAttribute("href", "/editor?duplicate=basic-rock");
    expect(screen.queryByRole("menuitem", { name: /Export/ })).toBeNull();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("announces a recovery action when the download fails", async () => {
    const user = userEvent.setup();
    downloadPatternShareEnvelope.mockImplementationOnce(() => {
      throw new Error("Download blocked");
    });
    render(<PatternActionsMenu pattern={pattern} />);

    screen
      .getByRole("button", { name: `More actions for ${pattern.name}` })
      .focus();
    await user.keyboard("{ArrowDown}");
    await user.click(
      screen.getByRole("menuitem", { name: `Export ${pattern.name} pattern` }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your browser download permissions and try again.",
    );
  });
});
