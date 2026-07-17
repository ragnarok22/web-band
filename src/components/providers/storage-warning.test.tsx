import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { StorageWarning } from "@/components/providers/storage-warning";
import { useStorageStore } from "@/stores/storage-store";

describe("storage warning", () => {
  beforeEach(() => {
    useStorageStore.setState({
      isInitialized: false,
      mode: "memory",
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
});
