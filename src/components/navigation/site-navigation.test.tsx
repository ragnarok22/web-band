import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SiteNavigation } from "@/components/navigation/site-navigation";
import { usePracticeUiStore } from "@/stores/practice-ui-store";

const navigation = vi.hoisted(() => ({ pathname: "/history" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("site navigation", () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    navigation.pathname = "/history";
    usePracticeUiStore.setState({ isFocusMode: false, openModalCount: 0 });
  });

  it("includes History as the active primary destination", () => {
    render(<SiteNavigation />);
    expect(screen.getAllByRole("link")).toHaveLength(6);
    expect(screen.getByRole("link", { name: "Web Band home" })).toHaveAttribute(
      "href",
      "/practice",
    );
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("includes Settings as a primary destination", () => {
    navigation.pathname = "/settings";
    render(<SiteNavigation />);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("includes About as a primary destination", () => {
    navigation.pathname = "/about";
    render(<SiteNavigation />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("still hides primary navigation during practice focus mode", () => {
    navigation.pathname = "/practice";
    usePracticeUiStore.setState({ isFocusMode: true });
    render(<SiteNavigation />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("opens a named mobile Sheet, closes on Escape, and restores focus", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const user = userEvent.setup();
    render(<SiteNavigation />);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    expect(screen.queryByRole("link", { name: "History" })).toBeNull();
    await user.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Web Band navigation" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(usePracticeUiStore.getState().openModalCount).toBe(1);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
    expect(usePracticeUiStore.getState().openModalCount).toBe(0);
  });

  it("dismisses mobile navigation when following a link or resizing to desktop", async () => {
    const listeners = new Set<() => void>();
    const media = {
      matches: false,
      addEventListener: (_event: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) =>
        listeners.delete(listener),
    };
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => media),
    );
    const user = userEvent.setup();
    render(<SiteNavigation />);
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    // Keep jsdom from trying to load another document after the navigation event.
    const link = screen.getByRole("link", { name: "About" });
    link.addEventListener("click", (event) => event.preventDefault());
    await user.click(link);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    act(() => {
      media.matches = true;
      listeners.forEach((listener) => listener());
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("link", { name: "Practice" })).toBeVisible();
    expect(usePracticeUiStore.getState().openModalCount).toBe(0);
  });
});
