import { act, render, screen, waitFor } from "@testing-library/react";
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
    const pendingSave = new Promise<void>((resolve) => {
      finishSave = resolve;
    });
    const onSave = vi.fn(() => pendingSave);
    render(
      <StrummingPatternEditorDialog
        onClose={vi.fn()}
        onSave={onSave}
        timeSignature={{ numerator: 4, denominator: 4 }}
      />,
    );
    try {
      // Let the dialog's queued initial focus settle before typing into the form.
      await waitFor(() =>
        expect(
          screen.getByRole("button", {
            name: "Close strumming pattern editor",
          }),
        ).toHaveFocus(),
      );
      const nameInput = screen.getByRole("textbox", { name: "Pattern name" });
      await user.clear(nameInput);
      await user.type(nameInput, "Evening strums");
      expect(nameInput).toHaveValue("Evening strums");
      await user.click(
        screen.getByRole("button", { name: "Save strumming pattern" }),
      );
      await waitFor(() =>
        expect(onSave).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({ name: "Evening strums" }),
        ),
      );
      const accent = screen.getAllByRole("checkbox")[0]!;
      await waitFor(() =>
        expect(accent).toHaveAttribute("aria-disabled", "true"),
      );
      const checked = accent.getAttribute("aria-checked");
      await user.click(accent);
      expect(accent).toHaveAttribute("aria-checked", checked);
    } finally {
      await act(async () => finishSave());
    }
  });
});
