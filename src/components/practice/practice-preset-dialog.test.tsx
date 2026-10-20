import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PracticePresetDialog } from "@/components/practice/practice-preset-dialog";

describe("practice preset dialog loading", () => {
  it("keeps the dialog usable while replacing only unavailable preset cards", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const props = {
      errorMessage: null,
      isHydrated: false,
      onClose,
      onDelete: vi.fn(),
      onDuplicate: vi.fn(),
      onFavorite: vi.fn(),
      onLoad: vi.fn(),
      onRename: vi.fn(),
      open: true,
      presets: [],
      recentPresetIds: [],
    };
    const { rerender } = render(<PracticePresetDialog {...props} />);
    const dialog = screen.getByRole("dialog", { name: "Practice presets" });

    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Loading presets…",
    );
    expect(dialog.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(within(dialog).queryByText("Nothing here yet")).toBeNull();
    expect(screen.queryByRole("main")).toBeNull();
    await user.click(
      within(dialog).getByRole("button", { name: "Close practice presets" }),
    );
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <PracticePresetDialog
        {...props}
        isHydrated
        errorMessage="Presets could not be loaded."
      />,
    );
    expect(dialog.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Presets could not be loaded.",
    );
    expect(within(dialog).getByText("Nothing here yet")).toBeVisible();
  });
});
