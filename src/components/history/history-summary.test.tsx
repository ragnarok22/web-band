import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HistorySummary } from "@/components/history/history-summary";

describe("practice overview", () => {
  it("has no invented favorite mode or nonzero metrics for an empty collection", () => {
    render(<HistorySummary sessions={[]} now={new Date(2026, 9, 20)} />);
    const region = screen.getByRole("region", { name: "Practice overview" });
    expect(within(region).getAllByText("0 sec")).toHaveLength(2);
    expect(within(region).getByText("0", { selector: "dd" })).toBeVisible();
    expect(within(region).getByText("—", { selector: "dd" })).toBeVisible();
    expect(
      within(region).queryByText(/Most used range|Most used pattern|None yet/),
    ).not.toBeInTheDocument();
  });
});
