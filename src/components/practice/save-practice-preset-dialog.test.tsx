import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SavePracticePresetDialog } from "@/components/practice/save-practice-preset-dialog";

describe("save practice preset dialog", () => {
  it.each([
    {
      error: new Error("Preset storage is unavailable."),
      message: "Preset storage is unavailable.",
    },
    {
      error: "storage unavailable",
      message: "Practice preset could not be saved.",
    },
  ])(
    "clears the busy state and permits retry after rejection: $message",
    async ({ error, message }) => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onSave = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(true);
      render(
        <SavePracticePresetDialog
          errorMessage={null}
          onClose={onClose}
          onSave={onSave}
          open
        />,
      );
      const dialog = screen.getByRole("dialog", {
        name: "Save practice preset",
      });
      const name = screen.getByRole("textbox", { name: "Preset name" });
      const save = screen.getByRole("button", { name: "Save preset" });
      await user.type(name, "  Warm-up  ");
      await user.click(save);

      await waitFor(() => expect(save).toBeEnabled());
      expect(save).toHaveTextContent("Save preset");
      expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
      expect(screen.getByRole("alert")).toHaveTextContent(message);
      expect(dialog).toHaveAttribute("open");
      expect(name).toHaveValue("  Warm-up  ");
      expect(onClose).not.toHaveBeenCalled();
      expect(onSave).toHaveBeenCalledWith("Warm-up");

      await user.click(save);

      await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledOnce();
      expect(save).toBeEnabled();
    },
  );

  it.each([true, false])(
    "clears the busy state when saving resolves to %s",
    async (saved) => {
      const user = userEvent.setup();
      let finishSave!: (saved: boolean) => void;
      const onSave = vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            finishSave = resolve;
          }),
      );
      const onClose = vi.fn();
      render(
        <SavePracticePresetDialog
          errorMessage={null}
          onClose={onClose}
          onSave={onSave}
          open
        />,
      );
      const dialog = screen.getByRole("dialog", {
        name: "Save practice preset",
      });
      const save = screen.getByRole("button", { name: "Save preset" });
      await user.type(
        screen.getByRole("textbox", { name: "Preset name" }),
        "Warm-up",
      );
      await user.click(save);

      expect(save).toBeDisabled();
      expect(save).toHaveTextContent("Saving…");
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      expect(onClose).not.toHaveBeenCalled();

      await act(async () => finishSave(saved));

      expect(save).toBeEnabled();
      expect(save).toHaveTextContent("Save preset");
      expect(dialog).toHaveProperty("open", !saved);
      expect(onClose).toHaveBeenCalledTimes(saved ? 1 : 0);
    },
  );
});
