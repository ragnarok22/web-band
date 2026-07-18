import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HistoryScreen } from "@/components/history/history-screen";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import type { PracticeSession } from "@/types/persistence";

function session(
  id: string,
  patternName: string,
  startedAt: string,
  durationSeconds: number,
): PracticeSession {
  const endedAt = new Date(
    Date.parse(startedAt) + durationSeconds * 1_000,
  ).toISOString();
  return {
    category: "rock",
    createdAt: startedAt,
    durationSeconds,
    endedAt,
    endingBpm: 100,
    id,
    patternId: patternName.toLowerCase().replaceAll(" ", "-"),
    patternName,
    practiceMode: "drums",
    startedAt,
    startingBpm: 90,
    timeSignature: "4/4",
    updatedAt: endedAt,
  };
}

describe("history screen", () => {
  beforeEach(() => {
    usePracticeHistoryStore.setState({
      errorMessage: null,
      isHydrated: true,
      isLoading: false,
      sessions: [],
    });
  });

  it("shows a calm empty state", () => {
    render(<HistoryScreen />);
    expect(
      screen.getByRole("heading", { name: "No sessions yet" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Start practicing" }),
    ).toHaveAttribute("href", "/practice");
    expect(
      screen.getByRole("heading", { name: "Journal backup" }),
    ).toBeVisible();
    expect(screen.getByText("Import backup")).toBeVisible();
  });

  it("renders local summaries and groups recent sessions by day", () => {
    usePracticeHistoryStore.setState({
      sessions: [
        session("evening", "Basic Rock", "2026-07-18T18:00:00.000Z", 180),
        session("morning", "One Drop", "2026-07-18T09:00:00.000Z", 120),
        session("older", "Basic Rock", "2026-07-17T09:00:00.000Z", 60),
      ],
    });
    render(<HistoryScreen />);

    expect(screen.getAllByText("6 min").length).toBeGreaterThan(0);
    expect(screen.getByText("3", { selector: "dd" })).toBeVisible();
    expect(screen.getByText("Basic Rock", { selector: "dd" })).toBeVisible();
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("requires confirmation before deleting one session", async () => {
    const user = userEvent.setup();
    const deleteOne = vi.fn().mockImplementation(async (id: string) => {
      usePracticeHistoryStore.setState((state) => ({
        sessions: state.sessions.filter((item) => item.id !== id),
      }));
    });
    usePracticeHistoryStore.setState({
      deleteOne,
      sessions: [session("one", "Basic Rock", "2026-07-18T18:00:00.000Z", 60)],
    });
    render(<HistoryScreen />);

    await user.click(
      screen.getByRole("button", { name: "Delete Basic Rock session" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Delete this session?" }),
    ).toBeVisible();
    expect(deleteOne).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete session" }));

    expect(deleteOne).toHaveBeenCalledWith("one");
    expect(
      await screen.findByRole("heading", { name: "No sessions yet" }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "The work you put in." }),
      ).toHaveFocus(),
    );
  });

  it("requires confirmation before clearing all sessions", async () => {
    const user = userEvent.setup();
    const clearAll = vi.fn().mockImplementation(async () => {
      usePracticeHistoryStore.setState({ sessions: [] });
    });
    usePracticeHistoryStore.setState({
      clearAll,
      sessions: [session("one", "Basic Rock", "2026-07-18T18:00:00.000Z", 60)],
    });
    render(<HistoryScreen />);

    await user.click(screen.getByRole("button", { name: "Clear all history" }));
    expect(
      screen.getByRole("dialog", { name: "Clear practice history?" }),
    ).toBeVisible();
    expect(clearAll).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(clearAll).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole("heading", { name: "No sessions yet" }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "The work you put in." }),
      ).toHaveFocus(),
    );
  });

  it("keeps destructive failures visible inside the open dialog", async () => {
    const user = userEvent.setup();
    usePracticeHistoryStore.setState({
      deleteOne: vi
        .fn()
        .mockRejectedValue(new Error("Journal storage is locked.")),
      sessions: [session("one", "Basic Rock", "2026-07-18T18:00:00.000Z", 60)],
    });
    render(<HistoryScreen />);

    await user.click(
      screen.getByRole("button", { name: "Delete Basic Rock session" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Delete this session?" });
    await user.click(
      within(dialog).getByRole("button", { name: "Delete session" }),
    );

    expect(dialog).toBeVisible();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Journal storage is locked.",
    );
  });

  it("contains long historical pattern names at narrow widths", () => {
    const longName = "A".repeat(100);
    usePracticeHistoryStore.setState({
      sessions: [session("long", longName, "2026-07-18T18:00:00.000Z", 60)],
    });
    render(<HistoryScreen />);

    const heading = screen.getByRole("heading", { name: longName });
    expect(heading).toHaveClass("truncate");
    expect(heading.closest("li")).toHaveClass("[content-visibility:auto]");
  });
});
