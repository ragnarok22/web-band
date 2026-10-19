import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StrummingPatternSelector } from "@/components/practice/strumming-pattern-selector";
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

async function openDeleteAction(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole("button", { name: "Pattern actions" }).focus();
  await user.keyboard("{ArrowDown}");
  await user.click(
    await screen.findByRole("menuitem", { name: "Delete pattern" }),
  );
}

describe("strumming pattern selector", () => {
  beforeEach(() => {
    useStrummingPatternStore.setState({
      ...useStrummingPatternStore.getInitialState(),
      customPatterns: [customPattern],
      isHydrated: true,
    });
  });

  it("warns about the selected meter and offers only compatible patterns", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StrummingPatternSelector
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
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await user.selectOptions(select, basicThreeFourPattern.id);
    expect(onChange).toHaveBeenCalledWith(basicThreeFourPattern);
  });

  it("groups compatible built-in and custom patterns without a duplicate preview", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StrummingPatternSelector
        onChange={onChange}
        pattern={quarterDownstrokesPattern}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );

    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    const select = screen.getByRole("combobox", { name: /Pattern for 4\/4/ });
    expect(
      within(select).getByRole("group", { name: "Built-in patterns" }),
    ).toBeInTheDocument();
    expect(
      within(select).getByRole("group", { name: "Custom patterns" }),
    ).toBeInTheDocument();
    await user.selectOptions(select, customPattern.id);
    expect(onChange).toHaveBeenCalledWith(customPattern);
  });

  it("creates and selects a custom strumming pattern", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const create = vi
      .fn<(input: StrummingPatternInput) => Promise<CustomStrummingPattern>>()
      .mockResolvedValue(customPattern);
    useStrummingPatternStore.setState({ create });
    render(
      <StrummingPatternSelector
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
      <StrummingPatternSelector
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
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit" })).toHaveFocus(),
    );

    await openDeleteAction(user);
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
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: /Pattern for 4\/4/ }),
      ).toHaveFocus(),
    );
  });

  it("identifies an unavailable selection without previewing or editing it", () => {
    useStrummingPatternStore.setState({ customPatterns: [] });
    render(
      <StrummingPatternSelector
        onChange={vi.fn()}
        pattern={customPattern}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );
    const select = screen.getByRole("combobox", { name: /Pattern for 4\/4/ });

    expect(select).toHaveValue("");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute(
      "aria-describedby",
      "strumming-pattern-unavailable",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("no longer available");
    expect(
      screen.getByRole("option", { name: "Unavailable custom pattern" }),
    ).toBeDisabled();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pattern actions" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    { disabled: true, isHydrated: true },
    { disabled: false, isHydrated: false },
  ])(
    "disables selection and editing when disabled=$disabled, hydrated=$isHydrated",
    ({ disabled, isHydrated }) => {
      useStrummingPatternStore.setState({ isHydrated });
      render(
        <StrummingPatternSelector
          disabled={disabled}
          onChange={vi.fn()}
          pattern={customPattern}
          timeSignature={{ denominator: 4, numerator: 4 }}
        />,
      );

      expect(
        screen.getByRole("combobox", { name: /Pattern for 4\/4/ }),
      ).toBeDisabled();
      for (const name of ["New", "Edit", "Pattern actions"]) {
        expect(screen.getByRole("button", { name })).toBeDisabled();
      }
    },
  );

  it("keeps built-in patterns read-only and cancels creation without changing selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StrummingPatternSelector
        onChange={onChange}
        pattern={quarterDownstrokesPattern}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pattern actions" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New" }));
    await user.type(
      screen.getByRole("textbox", { name: "Pattern name" }),
      "Unsaved draft",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "New" })).toHaveFocus();
  });

  it("cancels deletion and restores focus to the management trigger", async () => {
    const user = userEvent.setup();
    const deletePattern = vi.fn();
    useStrummingPatternStore.setState({ delete: deletePattern });
    render(
      <StrummingPatternSelector
        onChange={vi.fn()}
        pattern={customPattern}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );
    await openDeleteAction(user);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(deletePattern).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Pattern actions" }),
    ).toHaveFocus();
  });

  it("surfaces failed deletion without discarding the active custom pattern", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    useStrummingPatternStore.setState({
      delete: vi.fn().mockRejectedValue(new Error("Storage is unavailable.")),
    });
    render(
      <StrummingPatternSelector
        onChange={onChange}
        pattern={customPattern}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );
    await openDeleteAction(user);
    await user.click(
      screen.getByRole("button", {
        name: `Delete ${customPattern.name} permanently`,
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Storage is unavailable.",
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByRole("combobox", { name: /Pattern for 4\/4/ }),
    ).toHaveValue(customPattern.id);
  });

  it("retains the editor draft and selection when saving fails", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    useStrummingPatternStore.setState({
      update: vi.fn().mockRejectedValue(new Error("Could not save pattern.")),
    });
    render(
      <StrummingPatternSelector
        onChange={onChange}
        pattern={customPattern}
        timeSignature={{ denominator: 4, numerator: 4 }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(
      screen.getByRole("button", { name: "Save strumming pattern" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save pattern.",
    );
    expect(screen.getByRole("textbox", { name: "Pattern name" })).toHaveValue(
      customPattern.name,
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
