import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { SavePracticePresetDialog } from "@/components/practice/save-practice-preset-dialog";

function ControlledDialog(
  props: Omit<ComponentProps<typeof SavePracticePresetDialog>, "open">,
) {
  const [open, setOpen] = useState(true);
  return (
    <SavePracticePresetDialog
      {...props}
      open={open}
      onClose={() => {
        setOpen(false);
        props.onClose();
      }}
    />
  );
}

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
        <ControlledDialog
          errorMessage={null}
          onClose={onClose}
          onSave={onSave}
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
      expect(dialog).toBeVisible();
      expect(name).toHaveValue("  Warm-up  ");
      expect(onClose).not.toHaveBeenCalled();
      expect(onSave).toHaveBeenCalledWith("Warm-up");

      await user.click(save);

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledOnce();
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
        <ControlledDialog
          errorMessage={null}
          onClose={onClose}
          onSave={onSave}
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

      if (saved) {
        await waitFor(() =>
          expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
        );
      } else {
        expect(dialog).toBeVisible();
        expect(save).toBeEnabled();
        expect(save).toHaveTextContent("Save preset");
      }
      expect(onClose).toHaveBeenCalledTimes(saved ? 1 : 0);
    },
  );
});
