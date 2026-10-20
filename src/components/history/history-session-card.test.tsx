import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HistorySessionCard } from "@/components/history/history-session-card";
import { historySession } from "@/test/history-fixtures";

describe("history session cards", () => {
  it("defers local time formatting until after hydration with a different client locale and timezone", () => {
    const session = historySession("one");
    const card = <HistorySessionCard session={session} onDelete={vi.fn()} />;
    const clientTimeFormat = new Intl.DateTimeFormat("fr-FR", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
    }).format;
    const expectedTime = clientTimeFormat(new Date(session.startedAt));
    // Intl types declare a method, but format is an accessor at runtime.
    const prototype: { readonly format: unknown } =
      Intl.DateTimeFormat.prototype;
    const format = vi.spyOn(prototype, "format", "get");
    try {
      const markup = renderToString(card);
      expect(format).not.toHaveBeenCalled();

      format.mockReturnValue(clientTimeFormat);
      const container = document.createElement("div");
      container.innerHTML = markup;
      document.body.appendChild(container);
      expect(container.querySelector("time")).toBeEmptyDOMElement();
      const onRecoverableError = vi.fn();
      render(card, { container, hydrate: true, onRecoverableError });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector("time")).toHaveTextContent(expectedTime);
      expect(container.querySelector("time")).toHaveAttribute(
        "dateTime",
        session.startedAt,
      );
    } finally {
      format.mockRestore();
    }
  });

  it("updates the local time when the session start changes", () => {
    const onDelete = vi.fn();
    const { rerender, container } = render(
      <HistorySessionCard
        session={historySession("one")}
        onDelete={onDelete}
      />,
    );
    const session = historySession("two", {
      startedAt: new Date(2026, 9, 21, 8, 45).toISOString(),
    });
    rerender(<HistorySessionCard session={session} onDelete={onDelete} />);

    expect(container.querySelector("time")).toHaveTextContent(
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(session.startedAt)),
    );
    expect(container.querySelector("time")).toHaveAttribute(
      "dateTime",
      session.startedAt,
    );
  });

  it.each([
    ["drums", "Basic Rock", "Drums · rock · 4/4"],
    ["strumming", "Strumming", "Drum accompaniment: Basic Rock · 4/4"],
    ["chords", "Chords", "Drum accompaniment: Basic Rock · 4/4"],
    ["tempoTrainer", "Tempo Trainer", "Drum accompaniment: Basic Rock · 4/4"],
    ["metronome", "Metronome", "Quarter notes · 4/4 · Manual"],
  ] as const)(
    "renders only stored information for %s",
    async (practiceMode, title, metadata) => {
      const user = userEvent.setup();
      render(
        <HistorySessionCard
          onDelete={vi.fn()}
          session={historySession("one", {
            practiceMode,
            startingBpm: 80,
            endingBpm: 120,
            durationSeconds: 3661,
          })}
        />,
      );
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
      expect(screen.getByText(metadata)).toBeVisible();
      expect(screen.getByText("80 → 120 BPM")).toBeVisible();
      expect(screen.getByText("1h 1m 1s")).toBeVisible();
      const details = screen.getByRole("button", {
        name: `Details for ${title} session`,
      });
      expect(details).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Starting BPM")).not.toBeInTheDocument();
      await user.click(details);
      expect(details).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("Starting BPM")).toBeVisible();
      expect(screen.getByText("Ending BPM")).toBeVisible();
      expect(screen.getByText("Started")).toBeVisible();
      expect(screen.getByText("Ended")).toBeVisible();
      expect(
        screen.queryByText(/accuracy|precision|progression|quality score/i),
      ).not.toBeInTheDocument();
      if (practiceMode === "metronome") {
        expect(screen.queryByText("Pattern")).not.toBeInTheDocument();
        expect(screen.getByText("Subdivision")).toBeVisible();
      } else
        expect(
          screen.getByText(
            practiceMode === "drums" ? "Pattern" : "Drum accompaniment",
          ),
        ).toBeVisible();
      await user.click(details);
      expect(details).toHaveAttribute("aria-expanded", "false");
    },
  );

  it("describes progressive subdivision as a starting value, not a tracked sequence", async () => {
    const user = userEvent.setup();
    render(
      <HistorySessionCard
        onDelete={vi.fn()}
        session={historySession("one", {
          practiceMode: "metronome",
          trainingMode: "progressive",
          subdivision: 3,
          timeSignature: "6/8",
        })}
      />,
    );
    expect(
      screen.getByText("Eighth notes (starting) · 6/8 · Progressive"),
    ).toBeVisible();
    expect(screen.queryByText(/1 → 2 → 3 → 4/)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Details for Metronome session" }),
    );
    expect(screen.getByText("Starting subdivision")).toBeVisible();
    expect(screen.getByText("Progressive", { selector: "dd" })).toBeVisible();
  });

  it("keeps full historical names in details while containing compact titles", async () => {
    const user = userEvent.setup();
    const name = "A".repeat(100);
    render(
      <HistorySessionCard
        onDelete={vi.fn()}
        session={historySession("long", { patternName: name })}
      />,
    );
    expect(
      within(screen.getByRole("heading", { name })).getByText(name),
    ).toHaveClass("truncate");
    await user.click(
      screen.getByRole("button", { name: `Details for ${name} session` }),
    );
    expect(screen.getByText(name, { selector: "dd" })).toHaveClass(
      "break-words",
    );
  });
});
