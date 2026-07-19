import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ShortcutsDialog } from "@/components/practice/shortcuts-dialog";

describe("ShortcutsDialog", () => {
  it.each([
    { adjustmentStep: 1 as const, alternateStep: 5 },
    { adjustmentStep: 5 as const, alternateStep: 1 },
  ])(
    "describes the $adjustmentStep BPM default and $alternateStep BPM alternate shortcuts",
    ({ adjustmentStep, alternateStep }) => {
      render(
        <ShortcutsDialog
          adjustmentStep={adjustmentStep}
          onClose={vi.fn()}
          open
        />,
      );

      expect(screen.getByText("↑ / ↓").closest("div")).toHaveTextContent(
        `Change tempo by ${adjustmentStep} BPM`,
      );
      expect(
        screen.getByText("Shift + ↑ / ↓").closest("div"),
      ).toHaveTextContent(`Change tempo by ${alternateStep} BPM`);
    },
  );
});
