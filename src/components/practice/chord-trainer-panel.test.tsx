import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChordTrainerPanel } from "@/components/practice/chord-trainer-panel";
import type { ChordProgressionInput } from "@/stores/chord-progression-store";
import { useChordProgressionStore } from "@/stores/chord-progression-store";
import type { CustomChordProgression } from "@/types/persistence";

const customProgression: CustomChordProgression = {
  createdAt: "2026-07-18T10:00:00.000Z",
  id: "custom-turnaround",
  isBuiltIn: false,
  name: "Custom turnaround",
  steps: [
    { chord: "C", duration: 1, durationUnit: "measures", id: "custom-c" },
    { chord: "G", duration: 1, durationUnit: "measures", id: "custom-g" },
  ],
  updatedAt: "2026-07-18T10:00:00.000Z",
};

describe("chord trainer panel", () => {
  beforeEach(() => {
    useChordProgressionStore.setState({
      customProgressions: [customProgression],
      favoriteProgressionIds: [],
      isHydrated: true,
    });
  });

  it("adds, reorders, and saves chord steps in the native editor", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const update = vi.fn(
      async (_id: string, changes: Partial<ChordProgressionInput>) => ({
        ...customProgression,
        ...changes,
        updatedAt: "2026-07-18T11:00:00.000Z",
      }),
    );
    useChordProgressionStore.setState({ update });
    render(
      <ChordTrainerPanel
        configuration={{
          progression: customProgression,
          repeat: true,
          showCountdown: true,
        }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(
      screen.getByRole("dialog", { name: "Edit progression" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add chord" }));
    await user.type(screen.getByRole("textbox", { name: "Chord 3" }), "Am");
    await user.click(screen.getByRole("button", { name: "Move Am up" }));
    await user.click(screen.getByRole("button", { name: "Save progression" }));

    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    const changes = update.mock.calls[0]?.[1];
    expect(changes?.steps?.map(({ chord }) => chord)).toEqual(["C", "Am", "G"]);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        progression: expect.objectContaining({ name: "Custom turnaround" }),
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit" })).toHaveFocus(),
    );
  });

  it("requires a second explicit action before deleting a custom progression", async () => {
    const user = userEvent.setup();
    const deleteProgression = vi.fn().mockResolvedValue(undefined);
    const onChange = vi.fn();
    useChordProgressionStore.setState({ delete: deleteProgression });
    render(
      <ChordTrainerPanel
        configuration={{
          progression: customProgression,
          repeat: true,
          showCountdown: true,
        }}
        onChange={onChange}
      />,
    );

    const deleteTrigger = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteTrigger);

    expect(deleteProgression).not.toHaveBeenCalled();
    expect(
      screen.getByText("Delete Custom turnaround permanently?"),
    ).toBeVisible();
    expect(deleteTrigger).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(deleteTrigger).toHaveFocus();

    await user.click(deleteTrigger);
    await user.click(
      screen.getByRole("button", {
        name: "Delete Custom turnaround permanently",
      }),
    );

    expect(deleteProgression).toHaveBeenCalledWith(customProgression.id);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        progression: expect.objectContaining({ isBuiltIn: true }),
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Progression" }),
      ).toHaveFocus(),
    );
  });

  it("does not expose stale custom progression management actions", () => {
    useChordProgressionStore.setState({ customProgressions: [] });
    render(
      <ChordTrainerPanel
        configuration={{
          progression: customProgression,
          repeat: true,
          showCountdown: true,
        }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /selected custom progression is no longer available/i,
    );
  });

  it("reports favorite state and disables the toggle while persistence is pending", async () => {
    const user = userEvent.setup();
    let finishFavorite!: () => void;
    const toggleFavorite = vi.fn(async (progressionId: string) => {
      await new Promise<void>((resolve) => {
        finishFavorite = resolve;
      });
      useChordProgressionStore.setState({
        favoriteProgressionIds: [progressionId],
      });
    });
    useChordProgressionStore.setState({ toggleFavorite });
    render(
      <ChordTrainerPanel
        configuration={{
          progression: customProgression,
          repeat: true,
          showCountdown: true,
        }}
        onChange={vi.fn()}
      />,
    );
    const favoriteButton = screen.getByRole("button", {
      name: "Custom turnaround favorite",
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");

    await user.click(favoriteButton);
    expect(favoriteButton).toBeDisabled();

    await act(async () => finishFavorite());
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Custom turnaround favorite",
        }),
      ).toBeEnabled(),
    );
    expect(toggleFavorite).toHaveBeenCalledWith(customProgression.id);
    expect(
      screen.getByRole("button", {
        name: "Custom turnaround favorite",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("disables favorite changes until progressions hydrate", () => {
    useChordProgressionStore.setState({ isHydrated: false });
    render(
      <ChordTrainerPanel
        configuration={{
          progression: customProgression,
          repeat: true,
          showCountdown: true,
        }}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Custom turnaround favorite",
      }),
    ).toBeDisabled();
  });

  it("returns focus to the New trigger after native dialog close", async () => {
    const user = userEvent.setup();
    render(
      <ChordTrainerPanel
        configuration={{
          progression: customProgression,
          repeat: true,
          showCountdown: true,
        }}
        onChange={vi.fn()}
      />,
    );

    const newButton = screen.getByRole("button", { name: "New" });
    await user.click(newButton);
    await user.click(
      screen.getByRole("button", { name: "Close progression editor" }),
    );

    await waitFor(() => expect(newButton).toHaveFocus());
  });
});
