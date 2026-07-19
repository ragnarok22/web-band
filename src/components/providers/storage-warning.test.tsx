import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { StorageWarning } from "@/components/providers/storage-warning";
import { reportPreferenceWrite, useStorageStore } from "@/stores/storage-store";

describe("storage warning", () => {
  beforeEach(() => {
    useStorageStore.setState({
      corruptRowCounts: {},
      isInitialized: false,
      mode: "memory",
      preferenceWriteFailures: [],
      warning: null,
    });
  });

  it("stays hidden while persistent storage is healthy", () => {
    const { container } = render(<StorageWarning />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a nonblocking warning for memory fallback", () => {
    useStorageStore.setState({
      isInitialized: true,
      mode: "memory",
      warning: "Practice can continue in memory.",
    });
    render(<StorageWarning />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Practice can continue in memory.",
    );
  });

  it("shows coexisting warnings without exposing corrupt row contents", () => {
    useStorageStore.setState({
      corruptRowCounts: {
        customPatterns: 2,
        favoriteChordProgressions: 1,
      },
      isInitialized: true,
      mode: "memory",
      warning: "Practice can continue in memory.",
    });
    reportPreferenceWrite("Appearance", false);
    reportPreferenceWrite("History settings", false);

    render(<StorageWarning />);

    const warning = screen.getByRole("status");
    expect(warning).toHaveTextContent("Practice can continue in memory.");
    expect(warning).toHaveTextContent(
      "Some preferences could not be saved and may reset next visit: Appearance, History settings.",
    );
    expect(warning).toHaveTextContent(
      "Some saved data was partially recovered",
    );
    expect(warning).toHaveTextContent("Custom drum patterns: 2");
    expect(warning).toHaveTextContent("Favorite chord progressions: 1");
    expect(warning).not.toHaveTextContent("customPatterns");
  });
});
