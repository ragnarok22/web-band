import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsScreen } from "@/components/settings/settings-screen";
import { defaultHistorySettings } from "@/db/repositories/history-settings-repository";
import {
  defaultAppearancePreferences,
  useAppearanceStore,
} from "@/stores/appearance-store";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
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
  };
}

describe("settings screen", () => {
  beforeEach(() => {
    useAppearanceStore.setState({
      ...defaultAppearancePreferences,
      hasHydrated: true,
    });
    useHistorySettingsStore.setState({
      ...defaultHistorySettings,
      hasHydrated: true,
    });
    useStorageStore.setState({
      isInitialized: true,
      mode: "indexed-db",
      warning: null,
    });
  });

  it("updates practice history controls through the settings store", async () => {
    const user = userEvent.setup();
    render(<SettingsScreen actions={actions()} />);

    const enabled = screen.getByRole("checkbox", {
      name: "Save practice history",
    });
    await user.click(enabled);
    expect(useHistorySettingsStore.getState().enabled).toBe(false);

    const duration = screen.getByRole("spinbutton", {
      name: "Minimum session duration",
    });
    await user.clear(duration);
    await user.type(duration, "45");
    expect(useHistorySettingsStore.getState().minimumDurationSeconds).toBe(45);
    expect(screen.getByText("Saved on this device")).toBeVisible();
  });

  it("applies theme and reduced-motion preferences immediately", async () => {
    const user = userEvent.setup();
    render(<SettingsScreen actions={actions()} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Color theme" }),
      "light",
    );
    await user.click(screen.getByRole("checkbox", { name: "Reduce motion" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.reduceMotion).toBe("true");
  });

  it("requires destructive confirmation and announces successful deletion", async () => {
    const user = userEvent.setup();
    const settingsActions = actions();
    render(<SettingsScreen actions={settingsActions} />);

    await user.click(
      screen.getByRole("button", { name: "Delete all local data" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Delete all local data?" }),
    ).toBeVisible();
    expect(
      screen.getByText(/safety backup download is started before deletion/i),
    ).toBeVisible();
    const confirmButton = screen.getByRole("button", {
      name: "Delete local data",
    });
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
      screen.getByRole("button", { name: "Delete all local data" }),
    ).toHaveFocus();
  });
});
