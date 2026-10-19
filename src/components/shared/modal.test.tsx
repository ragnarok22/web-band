import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { Modal } from "@/components/shared/modal";
import { usePracticeUiStore } from "@/stores/practice-ui-store";

function DialogExample({ busy = false }: { busy?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open editor</button>
      <Modal
        open={open}
        busy={busy}
        onClose={() => setOpen(false)}
        aria-labelledby="example-title"
      >
        <h2 id="example-title">Editor</h2>
        <button onClick={() => setOpen(false)}>Cancel</button>
      </Modal>
    </>
  );
}

describe("feature modal", () => {
  beforeEach(() => usePracticeUiStore.setState({ openModalCount: 0 }));

  it("portals a named dialog and blocks practice shortcuts only while open", async () => {
    const user = userEvent.setup();
    const { container } = render(<DialogExample />);
    await user.click(screen.getByRole("button", { name: "Open editor" }));
    const dialog = screen.getByRole("dialog", { name: "Editor" });
    expect(container).not.toContainElement(dialog);
    expect(usePracticeUiStore.getState().openModalCount).toBe(1);
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(usePracticeUiStore.getState().openModalCount).toBe(0);
    expect(screen.getByRole("button", { name: "Open editor" })).toHaveFocus();
  });

  it("does not dismiss pending work on Escape", async () => {
    const user = userEvent.setup();
    render(<DialogExample busy />);
    await user.click(screen.getByRole("button", { name: "Open editor" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Editor" })).toBeVisible();
    expect(usePracticeUiStore.getState().openModalCount).toBe(1);
  });
});
