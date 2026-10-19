import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SectionErrorBoundary } from "@/components/errors/section-error-boundary";

let shouldThrow = true;

function UnstableSection() {
  if (shouldThrow) throw new Error("Private failure details");
  return <p>Recovered section</p>;
}

describe("section error boundary", () => {
  beforeEach(() => {
    shouldThrow = true;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("isolates a failed section and retries without removing siblings", () => {
    render(
      <>
        <p>Stable sibling</p>
        <SectionErrorBoundary section="Pattern workshop">
          <UnstableSection />
        </SectionErrorBoundary>
      </>,
    );

    expect(screen.getByText("Stable sibling")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Pattern workshop hit a snag" }),
    ).toBeVisible();
    expect(screen.queryByText("Private failure details")).toBeNull();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Recovered section")).toBeVisible();
    expect(screen.getByText("Stable sibling")).toBeInTheDocument();
  });

  it("silently removes an optional failed surface", () => {
    render(
      <>
        <SectionErrorBoundary section="Update notice" variant="silent">
          <UnstableSection />
        </SectionErrorBoundary>
        <p>Application remains available</p>
      </>,
    );

    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByText("Application remains available")).toBeVisible();
  });

  it("uses the 500 page for application failures and can recover", () => {
    render(
      <SectionErrorBoundary section="application" variant="application">
        <UnstableSection />
      </SectionErrorBoundary>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "We lost the rhythm.",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(
      screen.getByRole("link", { name: "Back to practice" }),
    ).toHaveAttribute("href", "/practice");
    expect(screen.queryByText("Private failure details")).toBeNull();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Recovered section")).toBeVisible();
  });
});
