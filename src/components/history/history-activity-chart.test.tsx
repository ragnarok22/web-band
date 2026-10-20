import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HistoryActivityChart } from "@/components/history/history-activity-chart";
import { getHistoryActivity } from "@/lib/practice-history";
import { historySession } from "@/test/history-fixtures";

describe("practice activity chart", () => {
  it("keeps informational graphics out of the keyboard tab order", async () => {
    const user = userEvent.setup();
    render(
      <>
        <HistoryActivityChart
          days={getHistoryActivity([], new Date(2026, 9, 20))}
        />
        <button type="button">Next control</button>
      </>,
    );

    for (const graphic of screen.getAllByRole("img")) {
      expect(graphic).not.toHaveAttribute("tabindex");
      expect(graphic.tabIndex).toBe(-1);
    }
    await user.tab();
    expect(screen.getByRole("button", { name: "Next control" })).toHaveFocus();
  });

  it("defers labels until after hydration with a different client locale and timezone", () => {
    const days = getHistoryActivity([], new Date(2026, 9, 20));
    const chart = <HistoryActivityChart days={days} />;
    const clientDayFormat = new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      timeZone: "America/Los_Angeles",
    }).format;
    const clientDateFormat = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Los_Angeles",
    }).format;
    // Intl types declare a method, but format is an accessor at runtime.
    const prototype: { readonly format: unknown } =
      Intl.DateTimeFormat.prototype;
    const format = vi.spyOn(prototype, "format", "get");
    try {
      const markup = renderToString(chart);
      expect(format).not.toHaveBeenCalled();

      format.mockImplementation(function (this: Intl.DateTimeFormat) {
        return this.resolvedOptions().weekday === "short"
          ? clientDayFormat
          : clientDateFormat;
      });
      const container = document.createElement("div");
      container.innerHTML = markup;
      document.body.appendChild(container);
      const onRecoverableError = vi.fn();
      render(chart, { container, hydrate: true, onRecoverableError });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(
        screen.getByRole("img", {
          name: `${clientDateFormat(days[6]!.date)} (today): 0 sec`,
        }),
      ).toBeVisible();
      expect(screen.getByText(clientDayFormat(days[6]!.date))).toBeVisible();
    } finally {
      format.mockRestore();
    }
  });

  it("refreshes localized dates when the activity window changes", () => {
    const { rerender } = render(
      <HistoryActivityChart
        days={getHistoryActivity([], new Date(2026, 9, 20))}
      />,
    );
    rerender(
      <HistoryActivityChart
        days={getHistoryActivity([], new Date(2026, 9, 21))}
      />,
    );
    expect(
      screen.getByRole("img", {
        name: "Wednesday, October 21, 2026 (today): 0 sec",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("img", { name: /October 14, 2026/ }),
    ).not.toBeInTheDocument();
  });

  it("exposes exact dates and durations to screen readers and on hover", async () => {
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
    await user.hover(today);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Tuesday, October 20, 2026 (today): 31 sec",
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
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
