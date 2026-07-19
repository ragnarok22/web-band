import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StrummingTrainerPanel } from "@/components/practice/strumming-trainer-panel";
import {
  basicPopPattern,
  basicThreeFourPattern,
  quarterDownstrokesPattern,
} from "@/data/strumming-patterns";
import type { StrummingPatternInput } from "@/stores/strumming-pattern-store";
import { useStrummingPatternStore } from "@/stores/strumming-pattern-store";
import type { CustomStrummingPattern } from "@/types/persistence";

const customPattern: CustomStrummingPattern = {
  ...structuredClone(basicPopPattern),
  createdAt: "2026-07-19T10:00:00.000Z",
  id: "custom-pop-strum",
  isBuiltIn: false,
  name: "Custom Pop Strum",
  updatedAt: "2026-07-19T10:00:00.000Z",
};

describe("strumming trainer panel", () => {
  beforeEach(() => {
    useStrummingPatternStore.setState({
      customPatterns: [customPattern],
      isHydrated: true,
    });
  });

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

  it("shows musical positions and includes compatible custom patterns", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StrummingTrainerPanel
        onChange={onChange}
        pattern={quarterDownstrokesPattern}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );

    const sequence = screen.getByRole("list", {
      name: `${quarterDownstrokesPattern.name} action sequence`,
    });
    expect(
      within(sequence)
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("data-position")),
    ).toEqual(["1", "&", "2", "&", "3", "&", "4", "&"]);

    const select = screen.getByRole("combobox", { name: /Pattern for 4\/4/ });
    expect(
      within(select).getByRole("group", { name: "Custom patterns" }),
    ).toBeInTheDocument();
    await user.selectOptions(select, customPattern.id);
    expect(onChange).toHaveBeenCalledWith(customPattern);
  });

  it("creates and selects a custom strumming pattern", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const create = vi.fn(
      async (_input: StrummingPatternInput) => customPattern,
    );
    useStrummingPatternStore.setState({ create });
    render(
      <StrummingTrainerPanel
        onChange={onChange}
        pattern={quarterDownstrokesPattern}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "New" }));
    await user.type(
      screen.getByRole("textbox", { name: "Pattern name" }),
      "Custom Pop Strum",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Action for position 2, &" }),
      "up",
    );
    await user.click(
      screen.getByRole("button", { name: "Save strumming pattern" }),
    );

    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      name: "Custom Pop Strum",
      steps: expect.arrayContaining([
        expect.objectContaining({ action: "up" }),
      ]),
      subdivision: 8,
      timeSignature: { denominator: 4, numerator: 4 },
    });
    expect(onChange).toHaveBeenCalledWith(customPattern);
  });

  it("edits and confirms deletion of a custom strumming pattern", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const update = vi.fn(async () => ({
      ...customPattern,
      name: "Edited Pop Strum",
      updatedAt: "2026-07-19T11:00:00.000Z",
    }));
    const deletePattern = vi.fn().mockResolvedValue(undefined);
    useStrummingPatternStore.setState({ delete: deletePattern, update });
    render(
      <StrummingTrainerPanel
        onChange={onChange}
        pattern={customPattern}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const name = screen.getByRole("textbox", { name: "Pattern name" });
    await user.clear(name);
    await user.type(name, "Edited Pop Strum");
    await user.click(
      screen.getByRole("button", { name: "Save strumming pattern" }),
    );
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Edited Pop Strum" }),
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(deletePattern).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", {
        name: "Delete Custom Pop Strum permanently",
      }),
    );
    expect(deletePattern).toHaveBeenCalledWith(customPattern.id);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ isBuiltIn: true }),
    );
  });
});
