import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryScreen } from "@/components/history/history-screen";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import { historySession } from "@/test/history-fixtures";

const initialState = usePracticeHistoryStore.getState();
const local = (day: number, hour = 12) =>
  new Date(2026, 9, day, hour).toISOString();

describe("practice journal", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 20, 15));
    usePracticeHistoryStore.setState({
      ...initialState,
      isHydrated: true,
      isLoading: false,
      sessions: [],
    });
  });
  afterEach(() => vi.useRealTimers());

  it("shows a compact empty state and application-wide backup access", () => {
    render(<HistoryScreen />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Practice history" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Your practice journey starts here.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Start practicing" }),
    ).toHaveAttribute("href", "/practice");
    expect(
      screen.getByRole("link", { name: "Manage backups in Settings" }),
    ).toHaveAttribute("href", "/settings");
    expect(
      screen.getByText(
        /including sessions, patterns, presets, and preferences/,
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("region", { name: "Practice overview" }),
    ).not.toBeInTheDocument();
  });

  it("preserves the hydration/loading and storage-error states", () => {
    usePracticeHistoryStore.setState({ isHydrated: false });
    const { rerender } = render(<HistoryScreen />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Opening your practice journal",
    );
    act(() =>
      usePracticeHistoryStore.setState({
        isHydrated: true,
        errorMessage: "Storage unavailable",
      }),
    );
    rerender(<HistoryScreen />);
    expect(screen.getByRole("alert")).toHaveTextContent("Storage unavailable");
  });

  it("renders exactly four truthful summaries, seven activity days, and daily totals", () => {
    usePracticeHistoryStore.setState({
      sessions: [
        historySession("a", {
          startedAt: local(20),
          durationSeconds: 31,
          practiceMode: "metronome",
        }),
        historySession("b", {
          startedAt: local(20, 9),
          durationSeconds: 29,
          practiceMode: "metronome",
        }),
        historySession("c", { startedAt: local(18), durationSeconds: 120 }),
      ],
    });
    render(<HistoryScreen />);
    const overview = screen.getByRole("region", { name: "Practice overview" });
    expect(overview.querySelectorAll("dl")).toHaveLength(4);
    expect(within(overview).getByText("3 min")).toBeVisible();
    expect(within(overview).getByText("1 min")).toBeVisible();
    expect(within(overview).getByText("3", { selector: "dd" })).toBeVisible();
    expect(
      within(overview).getByText("Drums", { selector: "dd" }),
    ).toBeVisible();
    expect(screen.queryByText("Most used range")).not.toBeInTheDocument();
    expect(screen.queryByText("Most used pattern")).not.toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByText("2 sessions · 1 min")).toBeVisible();
    expect(screen.getByText("1 session · 2 min")).toBeVisible();
    expect(document.querySelectorAll("[data-history-bar]")).toHaveLength(7);
    expect(
      screen.getByLabelText(/October 20, 2026 \(today\): 1 min/),
    ).toBeVisible();
  });

  it("makes metronome-only history complete without nonexistent patterns or ranges", () => {
    usePracticeHistoryStore.setState({
      sessions: [historySession("one", { practiceMode: "metronome" })],
    });
    render(<HistoryScreen />);
    expect(
      within(
        screen.getByRole("region", { name: "Practice overview" }),
      ).getByText("Metronome"),
    ).toBeVisible();
    expect(screen.getByText("Quarter notes · 4/4 · Manual")).toBeVisible();
    expect(
      screen.queryByText(/None yet|No pattern yet|Basic Rock/),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-history-bar="2026-10-20"]'),
    ).toHaveStyle({ height: "77.5%" });
  });

  it("shows a zero-activity chart when saved sessions fall outside the last week", () => {
    usePracticeHistoryStore.setState({
      sessions: [historySession("old", { startedAt: local(1) })],
    });
    render(<HistoryScreen />);
    expect(screen.getByText("0 of 7 days practiced")).toBeVisible();
    expect(
      screen.getByText(/No saved practice in the last seven days/),
    ).toBeVisible();
    for (const bar of document.querySelectorAll("[data-history-bar]"))
      expect(bar).toHaveStyle({ height: "0%" });
  });

  it("combines filters, shows no-results, and clears filters without filtering overview", async () => {
    const user = userEvent.setup();
    usePracticeHistoryStore.setState({
      sessions: [
        historySession("new", {
          practiceMode: "metronome",
          startedAt: local(20),
        }),
        historySession("old", { startedAt: local(1) }),
      ],
    });
    render(<HistoryScreen />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Date range" }),
      "7",
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("1 matching session")).toBeVisible();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Practice mode" }),
      "drums",
    );
    expect(
      screen.getByRole("heading", { name: "No matching sessions" }),
    ).toBeVisible();
    expect(screen.getByText("0 matching sessions")).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Practice overview" }),
      ).getByText("2", { selector: "dd" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("combobox", { name: "Date range" })).toHaveValue(
      "all",
    );
    expect(screen.getByRole("combobox", { name: "Practice mode" })).toHaveValue(
      "all",
    );
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("sorts dates and sessions without losing day grouping", async () => {
    const user = userEvent.setup();
    usePracticeHistoryStore.setState({
      sessions: [
        historySession("new", {
          patternName: "New short",
          startedAt: local(20),
          durationSeconds: 10,
        }),
        historySession("old", {
          patternName: "Old long",
          startedAt: local(1),
          durationSeconds: 300,
        }),
      ],
    });
    render(<HistoryScreen />);
    const titles = () =>
      screen
        .getAllByRole("article")
        .map((article) => within(article).getByRole("heading").textContent);
    expect(titles()).toEqual(["New short", "Old long"]);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort sessions" }),
      "oldest",
    );
    expect(titles()).toEqual(["Old long", "New short"]);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort sessions" }),
      "longest",
    );
    expect(titles()).toEqual(["Old long", "New short"]);
    expect(
      screen.getByText(/Days ranked by their longest session/),
    ).toBeVisible();
  });

  it("requires confirmation and keeps selected filters after deletion", async () => {
    const user = userEvent.setup();
    const deleteOne = vi.fn().mockImplementation(async (id: string) => {
      usePracticeHistoryStore.setState((state) => ({
        sessions: state.sessions.filter((session) => session.id !== id),
      }));
    });
    usePracticeHistoryStore.setState({
      deleteOne,
      sessions: [
        historySession("one", { practiceMode: "metronome" }),
        historySession("two"),
      ],
    });
    render(<HistoryScreen />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Practice mode" }),
      "metronome",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Date range" }),
      "30",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort sessions" }),
      "oldest",
    );
    screen
      .getByRole("button", { name: "More options for Metronome session" })
      .focus();
    await user.keyboard("{ArrowDown}");
    await user.click(screen.getByRole("menuitem", { name: "Delete session" }));
    expect(deleteOne).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete session" }));
    expect(deleteOne).toHaveBeenCalledWith("one");
    expect(
      await screen.findByRole("heading", { name: "No matching sessions" }),
    ).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Practice mode" })).toHaveValue(
      "metronome",
    );
    expect(screen.getByRole("combobox", { name: "Date range" })).toHaveValue(
      "30",
    );
    expect(screen.getByRole("combobox", { name: "Sort sessions" })).toHaveValue(
      "oldest",
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveFocus(),
    );
    expect(screen.getByText("Metronome session deleted.")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("restores focus to the persistent session menu trigger on cancellation", async () => {
    const user = userEvent.setup();
    usePracticeHistoryStore.setState({ sessions: [historySession("one")] });
    render(<HistoryScreen />);
    const trigger = screen.getByRole("button", {
      name: "More options for Basic Rock session",
    });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    await user.click(screen.getByRole("menuitem", { name: "Delete session" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByRole("article", { hidden: true })).toBeInTheDocument();
  });

  it("keeps clear-all in More and requires confirmation", async () => {
    const user = userEvent.setup();
    const clearAll = vi
      .fn()
      .mockImplementation(async () =>
        usePracticeHistoryStore.setState({ sessions: [] }),
      );
    usePracticeHistoryStore.setState({
      clearAll,
      sessions: [historySession("one")],
    });
    render(<HistoryScreen />);
    expect(screen.queryByText("Clear all history")).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", {
      name: "More history options",
    });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "Backup & restore" }),
    ).toHaveAttribute("href", "/settings");
    await user.click(
      screen.getByRole("menuitem", { name: "Clear all history" }),
    );
    expect(
      screen.getByRole("alertdialog", { name: "Clear practice history?" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Patterns, presets, and preferences are kept. This cannot be undone./,
      ),
    ).toBeVisible();
    expect(clearAll).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(clearAll).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole("heading", {
        name: "Your practice journey starts here.",
      }),
    ).toBeVisible();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByText("Practice history cleared.")).toBeInTheDocument();
  });

  it.each(["one", "all"])(
    "retains %s deletion failures inside the open confirmation dialog",
    async (scope) => {
      const user = userEvent.setup();
      const failure = vi
        .fn()
        .mockRejectedValue(new Error("Journal storage is locked."));
      usePracticeHistoryStore.setState({
        clearAll: failure,
        deleteOne: failure,
        sessions: [historySession("one")],
      });
      render(<HistoryScreen />);
      screen
        .getByRole("button", {
          name:
            scope === "one"
              ? "More options for Basic Rock session"
              : "More history options",
        })
        .focus();
      await user.keyboard("{ArrowDown}");
      await user.click(
        screen.getByRole("menuitem", {
          name: scope === "one" ? "Delete session" : "Clear all history",
        }),
      );
      const dialog = screen.getByRole("alertdialog");
      await user.click(
        within(dialog).getByRole("button", {
          name: scope === "one" ? "Delete session" : "Clear all",
        }),
      );
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "Journal storage is locked.",
      );
      expect(dialog).toBeVisible();
      expect(screen.getByRole("article", { hidden: true })).toBeInTheDocument();
    },
  );

  it("progressively renders large histories without changing full matching day totals", async () => {
    const user = userEvent.setup();
    usePracticeHistoryStore.setState({
      sessions: Array.from({ length: 65 }, (_, index) =>
        historySession(String(index), { durationSeconds: 60 }),
      ),
    });
    render(<HistoryScreen />);
    expect(screen.getAllByRole("article")).toHaveLength(30);
    expect(screen.getByText("65 sessions · 1h 5m")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Show more sessions" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(60);
    await user.click(
      screen.getByRole("button", { name: "Show more sessions" }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(65);
    expect(
      screen.queryByRole("button", { name: "Show more sessions" }),
    ).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort sessions" }),
      "oldest",
    );
    expect(screen.getAllByRole("article")).toHaveLength(30);
  });

  it("refreshes date-dependent UI at midnight and on returning to the page", () => {
    vi.useRealTimers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 23, 59, 59));
    usePracticeHistoryStore.setState({ sessions: [historySession("one")] });
    const { unmount } = render(<HistoryScreen />);
    expect(
      screen.getByLabelText(/October 20, 2026 \(today\)/),
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_000));
    expect(
      screen.getByLabelText(/October 21, 2026 \(today\)/),
    ).toBeInTheDocument();
    vi.setSystemTime(new Date(2026, 9, 22, 12));
    fireEvent.focus(window);
    expect(
      screen.getByLabelText(/October 22, 2026 \(today\)/),
    ).toBeInTheDocument();
    vi.setSystemTime(new Date(2026, 9, 23, 12));
    fireEvent(document, new Event("visibilitychange"));
    expect(
      screen.getByLabelText(/October 23, 2026 \(today\)/),
    ).toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
