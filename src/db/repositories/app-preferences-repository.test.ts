import { describe, expect, it, vi } from "vitest";

import {
  clearAllAppPreferenceKeys,
  webBandPreferenceKeys,
} from "@/db/repositories/app-preferences-repository";

describe("app preferences repository", () => {
  it("removes every Web Band key without clearing unrelated origin data", () => {
    for (const key of webBandPreferenceKeys) {
      window.localStorage.setItem(key, "stored");
    }
    window.localStorage.setItem("unrelated-app", "keep");

    expect(clearAllAppPreferenceKeys()).toBe(true);

    for (const key of webBandPreferenceKeys) {
      expect(window.localStorage.getItem(key)).toBeNull();
    }
    expect(window.localStorage.getItem("unrelated-app")).toBe("keep");
  });

  it("attempts every key when one removal fails", () => {
    const originalRemoveItem = Storage.prototype.removeItem;
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    removeItem.mockImplementation(function (this: Storage, key: string) {
      if (key === webBandPreferenceKeys[0]) throw new Error("blocked");
      originalRemoveItem.call(this, key);
    });

    expect(clearAllAppPreferenceKeys()).toBe(false);
    expect(removeItem).toHaveBeenCalledTimes(webBandPreferenceKeys.length);
  });
});
