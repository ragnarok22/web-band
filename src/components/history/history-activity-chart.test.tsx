import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HistoryActivityChart } from "@/components/history/history-activity-chart";
import { getHistoryActivity } from "@/lib/practice-history";
import { historySession } from "@/test/history-fixtures";

describe("practice activity chart", () => {
  it("exposes exact dates and durations to keyboard and screen-reader users", async () => {
    const user = userEvent.setup();
    render(
      <HistoryActivityChart
        days={getHistoryActivity(
          [historySession("one")],
          new Date(2026, 9, 20, 15),
        )}
      />,
    );
    expect(screen.getAllByRole("img")).toHaveLength(7);
    expect(screen.getByText("1 of 7 days practiced")).toBeVisible();
    const today = screen.getByRole("img", {
      name: "Tuesday, October 20, 2026 (today): 31 sec",
    });
    today.focus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Tuesday, October 20, 2026 (today): 31 sec",
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(today).toHaveFocus();
  });

  it("provides zero-day text alternatives without visible fake activity", () => {
    render(
      <HistoryActivityChart
        days={getHistoryActivity([], new Date(2026, 9, 20))}
      />,
    );
    expect(screen.getAllByRole("img", { name: /: 0 sec$/ })).toHaveLength(7);
    expect(
      screen.getByText(/No saved practice in the last seven days/),
    ).toBeVisible();
  });
});
