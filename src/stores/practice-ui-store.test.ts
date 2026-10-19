import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRACTICE_LAYOUT_KEY } from "@/db/repositories/practice-layout-repository";
import { usePracticeStore } from "@/stores/practice-store";
import { usePracticeUiStore } from "@/stores/practice-ui-store";
import { useStorageStore } from "@/stores/storage-store";

describe("practice UI state", () => {
  beforeEach(() => {
    usePracticeUiStore.setState({
      controlsOpen: false,
      isFocusMode: false,
      openModalCount: 0,
    });
    useStorageStore.setState({ preferenceWriteFailures: [] });
  });

  it("persists layout without persisting focus, modal, or musical state", () => {
    const musicalState = usePracticeStore.getState();
    usePracticeUiStore.getState().setFocusMode(true);
    usePracticeUiStore.getState().openModal();
    expect(usePracticeUiStore.getState().setControlsOpen(true)).toBe(true);
    expect(JSON.parse(localStorage.getItem(PRACTICE_LAYOUT_KEY)!)).toEqual({
      version: 1,
      controlsOpen: true,
    });
    expect(usePracticeStore.getState()).toBe(musicalState);
    usePracticeUiStore.setState({ controlsOpen: false });
    usePracticeUiStore.getState().hydrateLayout();
    expect(usePracticeUiStore.getState()).toMatchObject({
      controlsOpen: true,
      isFocusMode: true,
      openModalCount: 1,
    });
  });

  it("keeps controls usable and reports a blocked preference write", () => {
    const set = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(usePracticeUiStore.getState().setControlsOpen(true)).toBe(false);
    expect(usePracticeUiStore.getState().controlsOpen).toBe(true);
    expect(useStorageStore.getState().preferenceWriteFailures).toContain(
      "practice layout",
    );
    set.mockRestore();
  });

  it("balances nested modal guards without negative counts", () => {
    const ui = usePracticeUiStore.getState();
    ui.openModal();
    ui.openModal();
    ui.closeModal();
    expect(usePracticeUiStore.getState().openModalCount).toBe(1);
    ui.closeModal();
    ui.closeModal();
    expect(usePracticeUiStore.getState().openModalCount).toBe(0);
    ui.toggleFocusMode();
    expect(usePracticeUiStore.getState().isFocusMode).toBe(true);
  });
});
