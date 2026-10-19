import { describe, expect, it, vi } from "vitest";
import {
  loadControlsOpen,
  PRACTICE_LAYOUT_KEY,
  saveControlsOpen,
} from "@/db/repositories/practice-layout-repository";
import { clearAllAppPreferenceKeys } from "@/db/repositories/app-preferences-repository";

describe("practice layout preference", () => {
  it("starts collapsed and persists only panel visibility", () => {
    expect(loadControlsOpen()).toBe(false);
    expect(saveControlsOpen(true)).toBe(true);
    expect(loadControlsOpen()).toBe(true);
    expect(JSON.parse(localStorage.getItem(PRACTICE_LAYOUT_KEY)!)).toEqual({
      version: 1,
      controlsOpen: true,
    });
    saveControlsOpen(false);
    expect(loadControlsOpen()).toBe(false);
  });
  it.each([
    "broken",
    "null",
    "[]",
    '{"version":2,"controlsOpen":true}',
    '{"version":1,"controlsOpen":"true"}',
  ])("safely rejects %s", (value) => {
    localStorage.setItem(PRACTICE_LAYOUT_KEY, value);
    expect(loadControlsOpen()).toBe(false);
  });
  it("handles blocked storage without breaking practice", () => {
    const get = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(loadControlsOpen()).toBe(false);
    get.mockRestore();
    const set = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(saveControlsOpen(true)).toBe(false);
    set.mockRestore();
  });
  it("participates in app-owned preference cleanup", () => {
    saveControlsOpen(true);
    localStorage.setItem("unrelated", "kept");
    expect(clearAllAppPreferenceKeys()).toBe(true);
    expect(loadControlsOpen()).toBe(false);
    expect(localStorage.getItem("unrelated")).toBe("kept");
  });
});
