import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChordProgressionSelector } from "@/components/practice/chord-progression-selector";
import { gDEmCProgression } from "@/data/chord-progressions";
import {
  useChordProgressionStore,
  type ChordProgressionInput,
} from "@/stores/chord-progression-store";
import { renderWithMotion as render } from "@/test/render-with-motion";
import type { CustomChordProgression } from "@/types/persistence";
import type { ChordProgression } from "@/types/practice";

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
const initialStore = useChordProgressionStore.getState();

function renderSelector(
  progression: ChordProgression = customProgression,
  disabled = false,
) {
  const onChange = vi.fn();
  render(
    <ChordProgressionSelector
      configuration={{ progression, repeat: true, showCountdown: true }}
      disabled={disabled}
      onChange={onChange}
      timeSignature={{ numerator: 4, denominator: 4 }}
    />,
  );
  return onChange;
}

async function openActions(user: ReturnType<typeof userEvent.setup>) {
  // jsdom has no popup geometry; use the same keyboard path as other menu tests.
  screen.getByRole("button", { name: "Progression actions" }).focus();
  await user.keyboard("{ArrowDown}");
  await screen.findByRole("menuitem", { name: "New progression" });
}

async function action(user: ReturnType<typeof userEvent.setup>, name: string) {
  await openActions(user);
  await user.click(screen.getByRole("menuitem", { name }));
}

describe("chord progression selector", () => {
  beforeEach(() => {
    useChordProgressionStore.setState({
      ...initialStore,
      customProgressions: [customProgression],
      favoriteProgressionIds: [],
      isHydrated: true,
    });
  });

  it("adds, reorders, and saves chord steps using the existing editor", async () => {
    const user = userEvent.setup();
    const update = vi.fn(
      async (_id: string, changes: Partial<ChordProgressionInput>) => ({
        ...customProgression,
        ...changes,
        updatedAt: "2026-07-18T11:00:00.000Z",
      }),
    );
    useChordProgressionStore.setState({ update });
    const onChange = renderSelector();
    await action(user, "Edit progression");
    expect(
      screen.getByRole("dialog", { name: "Edit progression" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Add chord" }));
    await user.type(screen.getByRole("textbox", { name: "Chord 3" }), "Am");
    await user.click(screen.getByRole("button", { name: "Move Am up" }));
    await user.click(screen.getByRole("button", { name: "Save progression" }));
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    expect(update.mock.calls[0]?.[1].steps?.map(({ chord }) => chord)).toEqual([
      "C",
      "Am",
      "G",
    ]);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        progression: expect.objectContaining({ name: "Custom turnaround" }),
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Progression actions" }),
      ).toHaveFocus(),
    );
  });

  it("requires explicit confirmation before deleting, then selects the built-in fallback", async () => {
    const user = userEvent.setup();
    const deleteProgression = vi.fn().mockResolvedValue(undefined);
    useChordProgressionStore.setState({ delete: deleteProgression });
    const onChange = renderSelector();
    const trigger = screen.getByRole("button", { name: "Progression actions" });
    await action(user, "Delete progression");
    expect(deleteProgression).not.toHaveBeenCalled();
    expect(
      screen.getByText("Delete Custom turnaround permanently?"),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(trigger).toHaveFocus();
    await action(user, "Delete progression");
    await user.click(
      screen.getByRole("button", {
        name: "Delete Custom turnaround permanently",
      }),
    );
    expect(deleteProgression).toHaveBeenCalledWith(customProgression.id);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ progression: gDEmCProgression }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Progression" }),
      ).toHaveFocus(),
    );
  });

  it("does not expose management actions for a missing custom progression", async () => {
    const user = userEvent.setup();
    useChordProgressionStore.setState({ customProgressions: [] });
    renderSelector();
    await openActions(user);
    expect(
      screen.queryByRole("menuitem", { name: "Edit progression" }),
    ).toBeNull();
    expect(
      screen.queryByRole("menuitem", { name: "Delete progression" }),
    ).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /selected custom progression is no longer available/i,
    );
  });

  it("reports favorite state, blocks pending writes, and groups favorites without duplicate options", async () => {
    const user = userEvent.setup();
    let finishFavorite!: () => void;
    const toggleFavorite = vi.fn(async (id: string) => {
      await new Promise<void>((resolve) => {
        finishFavorite = resolve;
      });
      useChordProgressionStore.setState({ favoriteProgressionIds: [id] });
    });
    useChordProgressionStore.setState({ toggleFavorite });
    renderSelector();
    const favorite = screen.getByRole("button", {
      name: "Custom turnaround favorite",
    });
    expect(favorite).toHaveAttribute("aria-pressed", "false");
    await user.click(favorite);
    expect(favorite).toBeDisabled();
    await act(async () => finishFavorite());
    await waitFor(() => expect(favorite).toBeEnabled());
    expect(toggleFavorite).toHaveBeenCalledWith(customProgression.id);
    expect(favorite).toHaveAttribute("aria-pressed", "true");
    expect(
      within(
        screen.getByRole("group", { name: "Favorite progressions" }),
      ).getByRole("option", { name: "Custom turnaround" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("option", { name: "Custom turnaround" }),
    ).toHaveLength(1);
  });

  it.each([false, true])(
    "disables configuration when hydration or the active session blocks it (%s)",
    (active) => {
      useChordProgressionStore.setState({ isHydrated: active });
      renderSelector(customProgression, active);
      expect(
        screen.getByRole("combobox", { name: "Progression" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Progression actions" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Custom turnaround favorite" }),
      ).toBeDisabled();
      for (const checkbox of screen.getAllByRole("checkbox"))
        expect(checkbox).toHaveAttribute("aria-disabled", "true");
    },
  );

  it("returns focus to the persistent menu trigger after closing the new editor", async () => {
    const user = userEvent.setup();
    renderSelector();
    await action(user, "New progression");
    await user.click(
      screen.getByRole("button", { name: "Close progression editor" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Progression actions" }),
      ).toHaveFocus(),
    );
  });

  it("selects built-in and custom progressions without mutating their source data", async () => {
    const user = userEvent.setup();
    const onChange = renderSelector();
    const select = screen.getByRole("combobox", { name: "Progression" });
    await user.selectOptions(select, gDEmCProgression.id);
    expect(onChange).toHaveBeenLastCalledWith({
      progression: gDEmCProgression,
      repeat: true,
      showCountdown: true,
    });
    expect(onChange.mock.calls[0]?.[0].progression).not.toBe(gDEmCProgression);
    await user.selectOptions(select, customProgression.id);
    expect(onChange).toHaveBeenLastCalledWith({
      progression: customProgression,
      repeat: true,
      showCountdown: true,
    });
  });

  it("offers copying but not editing or deletion for built-in progressions", async () => {
    const user = userEvent.setup();
    const copyBuiltIn = vi.fn().mockResolvedValue(customProgression);
    useChordProgressionStore.setState({ copyBuiltIn });
    const onChange = renderSelector(gDEmCProgression);
    await openActions(user);
    expect(
      screen.queryByRole("menuitem", { name: "Edit progression" }),
    ).toBeNull();
    expect(
      screen.queryByRole("menuitem", { name: "Delete progression" }),
    ).toBeNull();
    await user.click(screen.getByRole("menuitem", { name: "Copy built-in" }));
    expect(copyBuiltIn).toHaveBeenCalledWith(gDEmCProgression.id);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ progression: customProgression }),
    );
  });

  it("preserves option changes and reports failed persistence operations", async () => {
    const user = userEvent.setup();
    useChordProgressionStore.setState({
      copyBuiltIn: vi.fn().mockRejectedValue(new Error("Storage unavailable")),
    });
    const onChange = renderSelector(gDEmCProgression);
    await user.click(
      screen.getByRole("checkbox", { name: "Repeat progression" }),
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ repeat: false, showCountdown: true }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Show change countdown" }),
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ repeat: true, showCountdown: false }),
    );
    await action(user, "Copy built-in");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Storage unavailable",
    );
  });
});
