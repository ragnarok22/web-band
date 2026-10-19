import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PracticePresetCard } from "@/components/practice/practice-preset-card";
import type { PracticePreset } from "@/types/persistence";

const preset: PracticePreset = {
  configuration: {
    bpm: 108,
    countInMeasures: 2,
    fillFrequency: 8,
    guidedPractice: { mode: "drums" },
    humanization: 0.12,
    patternId: "one-drop",
    swing: 0.2,
  },
  createdAt: "2026-07-18T10:00:00.000Z",
  id: "morning",
  isFavorite: false,
  lastUsedAt: null,
  name: "Morning Pocket",
  updatedAt: "2026-07-18T10:00:00.000Z",
};

function renderCard(onDelete: () => Promise<boolean>) {
  render(
    <PracticePresetCard
      onDelete={onDelete}
      onDuplicate={vi.fn()}
      onFavorite={vi.fn()}
      onLoad={vi.fn()}
      onRename={vi.fn()}
      preset={preset}
    />,
  );
}

describe("practice preset card deletion", () => {
  it.each([
    {
      error: new Error("Preset storage is unavailable."),
      message: "Preset storage is unavailable.",
    },
    {
      error: "storage unavailable",
      message: "Practice preset could not be deleted.",
    },
  ])(
    "handles a rejected delete with feedback and retry: $message",
    async ({ error, message }) => {
      const user = userEvent.setup();
      const onDelete = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(true);
      renderCard(onDelete);

      await user.click(
        screen.getByRole("button", { name: "Delete Morning Pocket" }),
      );
      await user.click(
        screen.getByRole("button", {
          name: "Delete Morning Pocket permanently",
        }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(
        screen.getByText("Delete Morning Pocket permanently?"),
      ).toBeVisible();
      const retry = screen.getByRole("button", {
        name: "Delete Morning Pocket permanently",
      });
      expect(retry).toBeEnabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
      expect(onDelete).toHaveBeenCalledOnce();

      await user.click(retry);

      await waitFor(() =>
        expect(
          screen.queryByText("Delete Morning Pocket permanently?"),
        ).not.toBeInTheDocument(),
      );
      expect(onDelete).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Load Morning Pocket" }),
      ).toBeEnabled();
    },
  );

  it("clears deletion errors on retry and when reopening confirmation", async () => {
    const user = userEvent.setup();
    const onDelete = vi
      .fn()
      .mockRejectedValueOnce(new Error("Preset storage is unavailable."))
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error("Preset storage is still unavailable."));
    renderCard(onDelete);

    await user.click(
      screen.getByRole("button", { name: "Delete Morning Pocket" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete Morning Pocket permanently" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Preset storage is unavailable.",
    );

    await user.click(
      screen.getByRole("button", { name: "Delete Morning Pocket permanently" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByText("Delete Morning Pocket permanently?"),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Delete Morning Pocket permanently" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Preset storage is still unavailable.",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    const deleteButton = screen.getByRole("button", {
      name: "Delete Morning Pocket",
    });
    expect(deleteButton).toHaveFocus();
    await user.click(deleteButton);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByText("Delete Morning Pocket permanently?"),
    ).toBeVisible();
    expect(onDelete).toHaveBeenCalledTimes(3);
  });

  it("keeps confirmation open when deletion reports false and closes only on success", async () => {
    const user = userEvent.setup();
    const onDelete = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    renderCard(onDelete);

    await user.click(
      screen.getByRole("button", { name: "Delete Morning Pocket" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete Morning Pocket permanently" }),
    );

    expect(
      screen.getByText("Delete Morning Pocket permanently?"),
    ).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "Delete Morning Pocket permanently" }),
    );

    await waitFor(() =>
      expect(
        screen.queryByText("Delete Morning Pocket permanently?"),
      ).not.toBeInTheDocument(),
    );
    expect(onDelete).toHaveBeenCalledTimes(2);
  });
});
