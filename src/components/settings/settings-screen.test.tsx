import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsScreen } from "@/components/settings/settings-screen";
import { StorageWarning } from "@/components/providers/storage-warning";
import { defaultHistorySettings } from "@/db/repositories/history-settings-repository";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import {
  defaultAppearancePreferences,
  useAppearanceStore,
} from "@/stores/appearance-store";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePracticeStore } from "@/stores/practice-store";
import { useStorageStore } from "@/stores/storage-store";

function actions() {
  return {
    clearAllLocalData: vi.fn(async () => ({
      cleared: true as const,
      settingsPersisted: true,
      warning: null,
    })),
    exportCurrentBackup: vi.fn(),
    importBackup: vi.fn(),
    resetSettings: vi.fn(() => ({
      reset: true as const,
      settingsPersisted: true,
      warning: null,
    })),
  };
}

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await screen.findByRole("listbox", { name: label });
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("settings screen", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAppearanceStore.setState({
      ...defaultAppearancePreferences,
      hasHydrated: true,
    });
    useHistorySettingsStore.setState({
      ...defaultHistorySettings,
      hasHydrated: true,
    });
    usePracticeStore.setState({
      ...structuredClone(defaultPracticeSettings),
      hasHydrated: true,
    });
    useStorageStore.setState({
      isInitialized: true,
      mode: "indexed-db",
      corruptRowCounts: {},
      preferenceWriteFailures: [],
      warning: null,
    });
  });

  it("updates practice history controls through the settings store", async () => {
    const user = userEvent.setup();
    render(<SettingsScreen actions={actions()} />);

    const enabled = screen.getByRole("switch", {
      name: "Save practice history",
    });
    const duration = screen.getByRole("spinbutton", {
      name: "Minimum session duration",
    });
    await user.clear(duration);
    await user.type(duration, "45");
    await user.tab();
    expect(useHistorySettingsStore.getState().minimumDurationSeconds).toBe(45);
    await user.click(enabled);
    expect(useHistorySettingsStore.getState().enabled).toBe(false);
    expect(duration).toBeDisabled();
    expect(duration).toHaveValue(45);
    await user.click(enabled);
    expect(duration).toBeEnabled();
    expect(duration).toHaveValue(45);
    expect(screen.getByText("Stored locally")).toBeVisible();
  });

  it("applies theme and reduced-motion preferences immediately", async () => {
    const user = userEvent.setup();
    render(<SettingsScreen actions={actions()} />);

    await choose(user, "Color theme", "Light");
    await user.click(screen.getByRole("switch", { name: "Reduce motion" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.reduceMotion).toBe("true");
    expect(
      JSON.parse(
        window.localStorage.getItem("web-band-appearance-v2") ?? "null",
      ),
    ).toMatchObject({ theme: "light", reducedMotion: true });
    await choose(user, "Color theme", "Dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("disables persisted toggles until their stores hydrate", () => {
    useAppearanceStore.setState({ hasHydrated: false });
    useHistorySettingsStore.setState({ hasHydrated: false });
    usePracticeStore.setState({ hasHydrated: false });
    render(<SettingsScreen actions={actions()} />);

    expect(
      screen.getByRole("switch", { name: "Reduce motion" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("switch", { name: "Save practice history" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("spinbutton", { name: "Minimum session duration" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("slider", { name: "Master volume" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Default count-in" }),
    ).toBeDisabled();
  });

  it("persists a global sound character", async () => {
    const user = userEvent.setup();
    render(<SettingsScreen actions={actions()} />);

    await choose(user, "Drum sound character", "Punchy");

    expect(usePracticeStore.getState().soundCharacter).toBe("punchy");
    expect(
      JSON.parse(
        window.localStorage.getItem("web-band-practice-settings-v4") ?? "null",
      ),
    ).toMatchObject({ soundCharacter: "punchy" });
  });

  it("persists practice and visual defaults using the existing preference formats", async () => {
    const user = userEvent.setup();
    render(<SettingsScreen actions={actions()} />);

    await choose(user, "Visual subdivision detail", "All sixteenths");
    await choose(user, "Beat flash intensity", "Strong");
    await choose(user, "Default count-in", "2 measures");
    await choose(user, "BPM adjustment", "5 BPM");
    const masterVolume = screen.getByRole("slider", { name: "Master volume" });
    expect(masterVolume).toHaveAttribute("aria-valuetext", "80 percent");
    fireEvent.change(masterVolume, { target: { value: "0.4" } });
    await user.click(
      screen.getByRole("switch", {
        name: "Keep screen awake while playing",
      }),
    );
    await user.click(
      screen.getByRole("switch", { name: "Restore last practice setup" }),
    );

    expect(useAppearanceStore.getState()).toMatchObject({
      beatFlashIntensity: "strong",
      visualSubdivisionDetail: "sixteenths",
    });
    expect(usePracticeStore.getState()).toMatchObject({
      bpmAdjustmentStep: 5,
      countInMeasures: 2,
      masterVolume: 0.4,
      restoreLastPractice: false,
      wakeLockEnabled: false,
    });
    expect(
      JSON.parse(
        window.localStorage.getItem("web-band-practice-settings-v4") ?? "null",
      ),
    ).toMatchObject({
      bpmAdjustmentStep: 5,
      countInMeasures: 2,
      masterVolume: 0.4,
      restoreLastPractice: false,
      wakeLockEnabled: false,
    });
    expect(
      JSON.parse(
        window.localStorage.getItem("web-band-appearance-v2") ?? "null",
      ),
    ).toMatchObject({
      beatFlashIntensity: "strong",
      visualSubdivisionDetail: "sixteenths",
    });
  });

  it("resets settings without destructive confirmation", async () => {
    const user = userEvent.setup();
    const settingsActions = actions();
    render(<SettingsScreen actions={settingsActions} />);

    await user.click(screen.getByRole("button", { name: "Reset preferences" }));

    expect(settingsActions.resetSettings).toHaveBeenCalledOnce();
    expect(
      screen.getByText(
        /patterns, presets, favorites, and practice history were preserved/i,
      ),
    ).toBeVisible();
  });

  it("requires destructive confirmation and announces successful deletion", async () => {
    const user = userEvent.setup();
    const settingsActions = actions();
    render(<SettingsScreen actions={settingsActions} />);

    await user.click(screen.getByRole("button", { name: "Delete local data" }));
    expect(
      screen.getByRole("dialog", { name: "Delete all local data?" }),
    ).toBeVisible();
    expect(
      screen.getByText(/safety backup download is started before deletion/i),
    ).toBeVisible();
    expect(settingsActions.clearAllLocalData).not.toHaveBeenCalled();
    const confirmButton = within(screen.getByRole("dialog")).getByRole(
      "button",
      {
        name: "Delete local data",
      },
    );
    expect(confirmButton).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: /I understand this removes all Web Band data/,
      }),
    );
    await user.click(confirmButton);

    await waitFor(() =>
      expect(settingsActions.clearAllLocalData).toHaveBeenCalledOnce(),
    );
    expect(
      await screen.findByText("All Web Band data on this device was deleted."),
    ).toHaveTextContent("All Web Band data on this device was deleted");
    expect(
      screen.getByRole("button", { name: "Delete local data" }),
    ).toHaveFocus();
  });

  it("keeps volume and sound together in Audio, not Practice", () => {
    render(<SettingsScreen actions={actions()} />);
    const audio = within(screen.getByRole("region", { name: "Audio" }));
    expect(
      audio.getByRole("slider", { name: "Master volume" }),
    ).toHaveAttribute("min", "0");
    expect(
      audio.getByRole("slider", { name: "Master volume" }),
    ).toHaveAttribute("max", "1");
    expect(
      audio.getByRole("combobox", { name: "Drum sound character" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Practice" })).queryByRole(
        "slider",
      ),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["0", 1],
    ["3601", 3600],
    ["45.6", 46],
  ] as const)(
    "preserves duration validation for %s seconds",
    (input, expected) => {
      render(<SettingsScreen actions={actions()} />);
      const duration = screen.getByRole("spinbutton", {
        name: "Minimum session duration",
      });
      fireEvent.change(duration, { target: { value: input } });
      fireEvent.blur(duration);
      expect(duration).toHaveValue(expected);
      expect(useHistorySettingsStore.getState().minimumDurationSeconds).toBe(
        expected,
      );
    },
  );

  it("restores an emptied duration field without changing the saved value", async () => {
    const user = userEvent.setup();
    render(<SettingsScreen actions={actions()} />);
    const duration = screen.getByRole("spinbutton", {
      name: "Minimum session duration",
    });
    await user.clear(duration);
    await user.tab();
    expect(duration).toHaveValue(30);
    expect(useHistorySettingsStore.getState().minimumDurationSeconds).toBe(30);
  });

  it("renders saved preferences without overwriting them on mount", () => {
    const practice = {
      ...defaultPracticeSettings,
      countInMeasures: 4,
      masterVolume: 0.35,
      soundCharacter: "soft",
    };
    const appearance = {
      ...defaultAppearancePreferences,
      theme: "light",
      visualSubdivisionDetail: "beats",
      reducedMotion: true,
    };
    const history = {
      settings: { enabled: false, minimumDurationSeconds: 90 },
      version: 1,
    };
    window.localStorage.setItem(
      "web-band-practice-settings-v4",
      JSON.stringify(practice),
    );
    window.localStorage.setItem(
      "web-band-appearance-v2",
      JSON.stringify(appearance),
    );
    window.localStorage.setItem(
      "web-band-history-settings-v1",
      JSON.stringify(history),
    );
    usePracticeStore.getState().hydrate();
    useAppearanceStore.getState().hydrate();
    useHistorySettingsStore.getState().hydrate();
    render(<SettingsScreen actions={actions()} />);
    expect(
      screen.getByRole("combobox", { name: "Default count-in" }),
    ).toHaveTextContent("4 measures");
    expect(
      screen.getByRole("combobox", { name: "Drum sound character" }),
    ).toHaveTextContent("Soft");
    expect(
      screen.getByRole("combobox", { name: "Color theme" }),
    ).toHaveTextContent("Light");
    expect(
      screen.getByRole("combobox", { name: "Visual subdivision detail" }),
    ).toHaveTextContent("Beats only");
    expect(screen.getByRole("switch", { name: "Reduce motion" })).toBeChecked();
    expect(
      screen.getByRole("switch", { name: "Save practice history" }),
    ).not.toBeChecked();
    expect(screen.getByRole("spinbutton")).toHaveValue(90);
    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      "35 percent",
    );
    expect(
      JSON.parse(
        window.localStorage.getItem("web-band-practice-settings-v4") ?? "null",
      ),
    ).toEqual(practice);
    expect(
      JSON.parse(
        window.localStorage.getItem("web-band-appearance-v2") ?? "null",
      ),
    ).toEqual(appearance);
    expect(
      JSON.parse(
        window.localStorage.getItem("web-band-history-settings-v1") ?? "null",
      ),
    ).toEqual(history);
  });

  it("shows visit-only storage honestly", () => {
    useStorageStore.setState({
      mode: "memory",
      warning: "New data lasts only for this visit.",
    });
    render(<SettingsScreen actions={actions()} />);
    expect(screen.getByText("Visit-only storage")).toBeVisible();
    expect(
      screen.getByText("New data lasts only for this visit."),
    ).toBeVisible();
    expect(screen.queryByText("Stored locally")).not.toBeInTheDocument();
  });

  it("preserves clear feedback when a preference cannot be saved", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage is unavailable");
    });
    render(
      <>
        <SettingsScreen actions={actions()} />
        <StorageWarning />
      </>,
    );
    await choose(user, "Color theme", "Light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(
      screen.getByText(/Some preferences could not be saved/),
    ).toBeVisible();
    expect(useStorageStore.getState().preferenceWriteFailures).toContain(
      "appearance",
    );
  });

  it("cancels deletion and restores focus without deleting data", async () => {
    const user = userEvent.setup();
    const settingsActions = actions();
    render(<SettingsScreen actions={settingsActions} />);
    const trigger = screen.getByRole("button", { name: "Delete local data" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(settingsActions.clearAllLocalData).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("retains deletion errors in the confirmation dialog", async () => {
    const user = userEvent.setup();
    const settingsActions = actions();
    settingsActions.clearAllLocalData.mockRejectedValue(
      new Error("Your safety backup could not be created."),
    );
    render(<SettingsScreen actions={settingsActions} />);
    await user.click(screen.getByRole("button", { name: "Delete local data" }));
    const dialog = within(screen.getByRole("dialog"));
    await user.click(dialog.getByRole("checkbox"));
    await user.click(dialog.getByRole("button", { name: "Delete local data" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "Your safety backup could not be created.",
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(
      dialog.getByRole("button", { name: "Delete local data" }),
    ).toBeEnabled();
  });
});
