import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PracticePresetBar } from "@/components/practice/practice-preset-bar";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import type {
  PracticePreset,
  PracticePresetConfiguration,
} from "@/types/persistence";

const currentConfiguration: PracticePresetConfiguration = {
  bpm: 108,
  countInMeasures: 2,
  fillFrequency: 8,
  guidedPractice: { mode: "drums" },
  humanization: 0.12,
  patternId: "one-drop",
  swing: 0.2,
};

function createPreset(
  id: string,
  name: string,
  overrides: Partial<PracticePreset> = {},
): PracticePreset {
  return {
    configuration: structuredClone(currentConfiguration),
    createdAt: "2026-07-18T10:00:00.000Z",
    id,
    isFavorite: false,
    lastUsedAt: null,
    name,
    updatedAt: "2026-07-18T10:00:00.000Z",
    ...overrides,
  };
}

const morningPreset = createPreset("morning", "Morning Pocket", {
  lastUsedAt: "2026-07-18T12:00:00.000Z",
});

describe("practice preset bar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePracticePresetStore.setState({
      createSnapshot: vi.fn(),
      delete: vi.fn(),
      duplicate: vi.fn(),
      isHydrated: true,
      markUsed: vi.fn(),
      presets: [morningPreset],
      recentPresetIds: [morningPreset.id],
      rename: vi.fn(),
      toggleFavorite: vi.fn(),
    });
  });

  it("saves the complete current setup with a user-entered name", async () => {
    const user = userEvent.setup();
    const createSnapshot = vi.fn().mockResolvedValue(morningPreset);
    usePracticePresetStore.setState({ createSnapshot });

    render(
      <PracticePresetBar
        configuration={currentConfiguration}
        loadedPresetName="Morning Pocket"
        onLoad={vi.fn()}
      />,
    );

    expect(screen.getByText("Loaded: Morning Pocket")).toBeInTheDocument();
    expect(screen.getByText("Drums / 108 BPM / One Drop")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Save current setup" }),
    );
    const nameInput = screen.getByRole("textbox", { name: "Preset name" });
    expect(nameInput).toHaveFocus();
    await user.type(nameInput, "Reggae warm-up");
    await user.click(screen.getByRole("button", { name: "Save preset" }));

    expect(createSnapshot).toHaveBeenCalledWith({
      configuration: currentConfiguration,
      name: "Reggae warm-up",
    });
  });

  it("loads only after user action and marks a successful load as recent", async () => {
    const user = userEvent.setup();
    const onLoad = vi.fn().mockResolvedValue(undefined);
    const markUsed = vi.fn().mockResolvedValue(undefined);
    usePracticePresetStore.setState({ markUsed });

    render(
      <PracticePresetBar
        configuration={currentConfiguration}
        onLoad={onLoad}
      />,
    );

    expect(onLoad).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Open presets" }));
    expect(onLoad).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Load Morning Pocket" }),
    );

    await waitFor(() => expect(markUsed).toHaveBeenCalledWith("morning"));
    expect(onLoad).toHaveBeenCalledWith(morningPreset);
    expect(onLoad.mock.invocationCallOrder[0]).toBeLessThan(
      markUsed.mock.invocationCallOrder[0],
    );
  });

  it("toggles a favorite with pressed-state feedback", async () => {
    const user = userEvent.setup();
    const toggleFavorite = vi.fn(async (presetId: string) => {
      usePracticePresetStore.setState((state) => ({
        presets: state.presets.map((preset) =>
          preset.id === presetId
            ? { ...preset, isFavorite: !preset.isFavorite }
            : preset,
        ),
      }));
    });
    usePracticePresetStore.setState({ toggleFavorite });
    render(
      <PracticePresetBar
        configuration={currentConfiguration}
        onLoad={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", {
        name: "Add Morning Pocket to favorites",
      }),
    );

    expect(toggleFavorite).toHaveBeenCalledWith("morning");
    expect(
      screen.getByRole("button", {
        name: "Remove Morning Pocket from favorites",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("renames a preset inline", async () => {
    const user = userEvent.setup();
    const rename = vi.fn(async (presetId: string, name: string) => {
      usePracticePresetStore.setState((state) => ({
        presets: state.presets.map((preset) =>
          preset.id === presetId ? { ...preset, name } : preset,
        ),
      }));
      return { ...morningPreset, name };
    });
    usePracticePresetStore.setState({ rename });
    render(
      <PracticePresetBar
        configuration={currentConfiguration}
        onLoad={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: "Rename Morning Pocket" }),
    );
    const renameInput = screen.getByRole("textbox", {
      name: "Rename Morning Pocket",
    });
    await user.clear(renameInput);
    await user.type(renameInput, "Evening Pocket");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(rename).toHaveBeenCalledWith("morning", "Evening Pocket");
    expect(
      screen.getByRole("heading", { name: "Evening Pocket" }),
    ).toBeInTheDocument();
  });

  it("shows inline validation for a whitespace-only rename", async () => {
    const user = userEvent.setup();
    const rename = vi.fn();
    usePracticePresetStore.setState({ rename });
    render(
      <PracticePresetBar
        configuration={currentConfiguration}
        onLoad={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: "Rename Morning Pocket" }),
    );
    const renameInput = screen.getByRole("textbox", {
      name: "Rename Morning Pocket",
    });
    await user.clear(renameInput);
    await user.type(renameInput, "   ");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(rename).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a preset name/i);
  });

  it("duplicates a preset", async () => {
    const user = userEvent.setup();
    const duplicate = vi
      .fn()
      .mockResolvedValue(createPreset("copy", "Morning Pocket copy"));
    usePracticePresetStore.setState({ duplicate });
    render(
      <PracticePresetBar
        configuration={currentConfiguration}
        onLoad={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: "Duplicate Morning Pocket" }),
    );

    expect(duplicate).toHaveBeenCalledWith("morning");
  });

  it("requires explicit in-dialog confirmation before deleting", async () => {
    const user = userEvent.setup();
    const deletePreset = vi.fn().mockResolvedValue(undefined);
    usePracticePresetStore.setState({ delete: deletePreset });
    render(
      <PracticePresetBar
        configuration={currentConfiguration}
        onLoad={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    await user.click(
      screen.getByRole("button", { name: "Delete Morning Pocket" }),
    );

    expect(deletePreset).not.toHaveBeenCalled();
    expect(
      screen.getByText("Delete Morning Pocket permanently?"),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", {
        name: "Delete Morning Pocket permanently",
      }),
    );
    expect(deletePreset).toHaveBeenCalledWith("morning");
  });

  it("filters favorites and preserves explicit recent ordering", async () => {
    const user = userEvent.setup();
    const first = createPreset("first", "First Groove", {
      lastUsedAt: "2026-07-18T11:00:00.000Z",
    });
    const favorite = createPreset("favorite", "Favorite Groove", {
      isFavorite: true,
    });
    usePracticePresetStore.setState({
      presets: [first, favorite, morningPreset],
      recentPresetIds: [morningPreset.id, first.id],
    });
    render(
      <PracticePresetBar
        configuration={currentConfiguration}
        onLoad={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open presets" }));
    const list = screen.getByRole("list", { name: "Recent presets" });
    expect(
      within(list)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Morning Pocket", "First Groove"]);

    await user.click(screen.getByRole("tab", { name: "Favorites" }));
    expect(
      screen.getByRole("heading", { name: "Favorite Groove" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Morning Pocket" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("keeps persistence errors nonblocking and closes on native cancel", async () => {
    const user = userEvent.setup();
    const createSnapshot = vi
      .fn()
      .mockRejectedValue(new Error("Preset could not be saved locally."));
    usePracticePresetStore.setState({ createSnapshot });
    render(
      <PracticePresetBar
        configuration={currentConfiguration}
        onLoad={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Save current setup" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Preset name" }),
      "Warm-up",
    );
    await user.click(screen.getByRole("button", { name: "Save preset" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Preset could not be saved locally.",
    );
    const dialog = screen.getByRole("dialog", { name: "Save practice preset" });
    expect(dialog).toHaveAttribute("open");
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  });

  it("shows inline validation for a whitespace-only preset name", async () => {
    const user = userEvent.setup();
    const createSnapshot = vi.fn();
    usePracticePresetStore.setState({ createSnapshot });
    render(
      <PracticePresetBar
        configuration={currentConfiguration}
        onLoad={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Save current setup" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Preset name" }),
      "   ",
    );
    await user.click(screen.getByRole("button", { name: "Save preset" }));

    expect(createSnapshot).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a preset name/i);
  });
});
