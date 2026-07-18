import { fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";

describe("unsaved changes guard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("guards reloads, same-origin links, and browser back only while dirty", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const forward = vi
      .spyOn(window.history, "forward")
      .mockImplementation(() => undefined);
    const { rerender, unmount } = renderHook(
      ({ dirty }) => useUnsavedChangesGuard(dirty),
      { initialProps: { dirty: true } },
    );

    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);

    const link = document.createElement("a");
    link.href = `${window.location.origin}/patterns`;
    document.body.append(link);
    expect(fireEvent.click(link)).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();

    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(forward).toHaveBeenCalledOnce();

    rerender({ dirty: false });
    link.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    fireEvent.click(link);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(forward).toHaveBeenCalledOnce();

    unmount();
    link.remove();
  });
});
