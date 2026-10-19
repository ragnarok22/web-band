import { fireEvent, render } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import GlobalError from "@/app/global-error";

it("renders a standalone, recoverable document when the root layout fails", () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const retry = vi.fn();
  const error = new Error("Private root failure");
  const view = render(<GlobalError error={error} retry={retry} />, {
    container: document,
    baseElement: document.documentElement,
  });

  expect(document.documentElement).toHaveAttribute("lang", "en");
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(document.title).toBe("500 — Something went wrong | Web Band");
  expect(document.querySelector('meta[name="viewport"]')).toHaveAttribute(
    "content",
    "width=device-width, initial-scale=1",
  );
  expect(document.body).toHaveAttribute("class");
  expect(view.getAllByRole("main")).toHaveLength(1);
  expect(view.getByRole("heading", { level: 1 })).toHaveTextContent(
    "We lost the rhythm.",
  );
  expect(
    view.getByRole("button", { name: "Back to practice" }).closest("form"),
  ).toHaveAttribute("action", "/practice");
  expect(document.body).not.toHaveTextContent("Private root failure");
  fireEvent.click(view.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
  expect(console.error).toHaveBeenCalledWith(error);
});
