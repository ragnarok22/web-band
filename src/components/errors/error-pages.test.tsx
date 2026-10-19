import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ApplicationError from "@/app/error";
import NotFound, { metadata } from "@/app/not-found";

describe("error pages", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("offers useful destinations for an unknown page", () => {
    render(<NotFound />);

    expect(screen.getByRole("main")).toHaveAccessibleName(
      "This beat is missing.",
    );
    expect(screen.getByText("404 / Page not found")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "This beat is missing.",
    );
    expect(
      screen.getByRole("link", { name: "Back to practice" }),
    ).toHaveAttribute("href", "/practice");
    expect(
      screen.getByRole("link", { name: "Explore grooves" }),
    ).toHaveAttribute("href", "/patterns");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(metadata.title).toBe("404 — Page not found");
  });

  it("retries a route error without exposing failure details or clearing settings", () => {
    const retry = vi.fn();
    const error = new Error("Private failure details");
    window.localStorage.setItem("saved-preferences", "keep me");
    render(<ApplicationError error={error} retry={retry} />);

    expect(screen.getByRole("main")).toHaveAccessibleName(
      "We lost the rhythm.",
    );
    expect(screen.getByText("500 / Something went wrong")).toBeVisible();
    expect(
      screen.queryByText("Private failure details"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to practice" }).closest("form"),
    ).toHaveAttribute("action", "/practice");
    expect(screen.queryByRole("link", { name: "Explore grooves" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalledWith(error);
    expect(window.localStorage.getItem("saved-preferences")).toBe("keep me");
  });

  it("handles thrown values that are not Error instances", () => {
    render(<ApplicationError error={null} retry={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "We lost the rhythm.",
    );
  });
});
