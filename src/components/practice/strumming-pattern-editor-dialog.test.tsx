import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StrummingPatternEditorDialog } from "@/components/practice/strumming-pattern-editor-dialog";

describe("strumming pattern editor dialog", () => {
  it("disables custom checkbox controls when editing is disabled", () => {
    render(
      <StrummingPatternEditorDialog
        disabled
        onClose={vi.fn()}
        onSave={vi.fn()}
        timeSignature={{ numerator: 4, denominator: 4 }}
      />,
    );
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("prevents accent changes while saving", async () => {
    const user = userEvent.setup();
    let finishSave!: () => void;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );
    render(
      <StrummingPatternEditorDialog
        onClose={vi.fn()}
        onSave={onSave}
        timeSignature={{ numerator: 4, denominator: 4 }}
      />,
    );
    await user.clear(screen.getByRole("textbox", { name: "Pattern name" }));
    await user.type(
      screen.getByRole("textbox", { name: "Pattern name" }),
      "Evening strums",
    );
    await user.click(
      screen.getByRole("button", { name: "Save strumming pattern" }),
    );
    const accent = screen.getAllByRole("checkbox")[0]!;
    expect(accent).toHaveAttribute("aria-disabled", "true");
    const checked = accent.getAttribute("aria-checked");
    await user.click(accent);
    expect(accent).toHaveAttribute("aria-checked", checked);
    await act(async () => finishSave());
  });
});
