import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldError } from "@/components/ui/field";

describe("field error", () => {
  it("preserves each message's list item when errors reorder", () => {
    const { rerender } = render(
      <FieldError
        errors={[{ message: "Required" }, { message: "Invalid format" }]}
      />,
    );
    const requiredItem = screen.getByText("Required");
    const invalidItem = screen.getByText("Invalid format");

    rerender(
      <FieldError
        errors={[{ message: "Invalid format" }, { message: "Required" }]}
      />,
    );

    expect(screen.getByText("Required")).toBe(requiredItem);
    expect(screen.getByText("Invalid format")).toBe(invalidItem);
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Invalid format", "Required"]);
  });

  it("preserves remaining list items when an earlier error is removed", () => {
    const { rerender } = render(
      <FieldError
        errors={[
          { message: "Required" },
          { message: "Invalid format" },
          { message: "Too short" },
        ]}
      />,
    );
    const invalidItem = screen.getByText("Invalid format");
    const shortItem = screen.getByText("Too short");

    rerender(
      <FieldError
        errors={[{ message: "Invalid format" }, { message: "Too short" }]}
      />,
    );

    expect(screen.queryByText("Required")).not.toBeInTheDocument();
    expect(screen.getByText("Invalid format")).toBe(invalidItem);
    expect(screen.getByText("Too short")).toBe(shortItem);
  });

  it("keeps deduplicating messages and omitting empty errors", () => {
    render(
      <FieldError
        errors={[
          undefined,
          {},
          { message: "" },
          { message: "Required" },
          { message: "Required" },
          { message: "Invalid format" },
        ]}
      />,
    );

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Required", "Invalid format"]);
  });

  it("keeps a single unique error as plain alert content", () => {
    render(
      <FieldError
        errors={[{ message: "Required" }, { message: "Required" }]}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-slot",
      "field-error",
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("keeps children overriding error messages", () => {
    render(
      <FieldError errors={[{ message: "Required" }]}>
        Check this field
      </FieldError>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Check this field");
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });

  it("keeps an empty error list hidden", () => {
    render(<FieldError errors={[]} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
