import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StrummingTrainerPanel } from "@/components/practice/strumming-trainer-panel";
import {
  basicThreeFourPattern,
  quarterDownstrokesPattern,
} from "@/data/strumming-patterns";

describe("strumming trainer panel", () => {
  it("warns about the selected meter and offers only compatible patterns", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StrummingTrainerPanel
        onChange={onChange}
        pattern={quarterDownstrokesPattern}
        timeSignature={{ denominator: 4, numerator: 3 }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "cannot follow this 3/4 drum groove",
    );
    const select = screen.getByRole("combobox", { name: /Pattern for 3\/4/ });
    const options = within(select).getAllByRole("option");
    expect(options.map((option) => option.getAttribute("value"))).toEqual([
      "",
      basicThreeFourPattern.id,
    ]);
    expect(screen.getAllByRole("listitem", { name: /Step/ })).toHaveLength(
      quarterDownstrokesPattern.steps.length,
    );

    await user.selectOptions(select, basicThreeFourPattern.id);
    expect(onChange).toHaveBeenCalledWith(basicThreeFourPattern);
  });
});
