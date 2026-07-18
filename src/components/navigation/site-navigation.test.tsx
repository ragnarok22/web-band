import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteNavigation } from "@/components/navigation/site-navigation";
import { usePracticeUiStore } from "@/stores/practice-ui-store";

const navigation = vi.hoisted(() => ({ pathname: "/history" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("site navigation", () => {
  beforeEach(() => {
    navigation.pathname = "/history";
    usePracticeUiStore.setState({ isFocusMode: false, openModalCount: 0 });
  });

  it("includes History as the active primary destination", () => {
    render(<SiteNavigation />);
    expect(screen.getAllByRole("link")).toHaveLength(4);
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

  it("still hides primary navigation during practice focus mode", () => {
    navigation.pathname = "/practice";
    usePracticeUiStore.setState({ isFocusMode: true });
    render(<SiteNavigation />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
