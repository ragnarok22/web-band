import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DrumPatternEditor } from "@/components/editor/drum-pattern-editor";
import { createDefaultPatternDraft } from "@/lib/drum-pattern-editor";
import { useAudioStore } from "@/stores/audio-store";
import { usePatternStore } from "@/stores/pattern-store";

const navigation = vi.hoisted(() => ({
  params: new Map<string, string>(),
  push: vi.fn(),
  replace: vi.fn(),
}));
const engine = vi.hoisted(() => ({
  changePattern: vi.fn(() => false),
  play: vi.fn(() => Promise.resolve()),
  stop: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  useSearchParams: () => ({
    get: (key: string) => navigation.params.get(key) ?? null,
  }),
}));

vi.mock("@/audio/audio-engine", () => ({
  disposeAudioEngine: vi.fn(),
  getAudioEngine: () => engine,
}));

describe("drum pattern editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.params.clear();
    useAudioStore.setState({ errorMessage: null, status: "not-initialized" });
    usePatternStore.setState({
      customPatterns: [],
      favoritePatternIds: [],
      isHydrated: true,
      recentPatternIds: [],
    });
  });

  it("validates the draft and saves a new pattern without losing it", async () => {
    const user = userEvent.setup();
    const create = vi.fn(async (pattern) => pattern);
    usePatternStore.setState({ create });
    render(<DrumPatternEditor />);
    const name = await screen.findByRole("textbox", { name: "Pattern name" });

    await user.clear(name);
    await user.click(screen.getByRole("button", { name: "Save pattern" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pattern name is required",
    );
    expect(create).not.toHaveBeenCalled();

    await user.type(name, "Sunset Pocket");
    await user.click(
      screen.getByRole("button", { name: "Kick, step 1, empty" }),
    );
    await user.click(screen.getByRole("button", { name: "Save pattern" }));

    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    const saved = create.mock.calls[0]![0]!;
    expect(saved.name).toBe("Sunset Pocket");
    expect(saved.hits).toHaveLength(1);
    expect(navigation.replace).toHaveBeenCalledWith(
      `/editor?pattern=${encodeURIComponent(saved.id)}`,
    );
    expect(screen.getByDisplayValue("Sunset Pocket")).toBeInTheDocument();
    expect(screen.getByText("Pattern saved locally.")).toBeInTheDocument();
  });

  it("loads and updates an existing custom pattern", async () => {
    const user = userEvent.setup();
    const existing = createDefaultPatternDraft([], {
      createId: () => "existing",
      now: () => "2026-07-18T12:00:00.000Z",
    });
    existing.name = "Existing Pattern";
    navigation.params.set("pattern", existing.id);
    const update = vi.fn(async (_id, changes) => ({
      ...existing,
      ...changes,
      updatedAt: "2026-07-18T12:01:00.000Z",
    }));
    usePatternStore.setState({ customPatterns: [existing], update });
    render(<DrumPatternEditor />);

    const name = await screen.findByRole("textbox", { name: "Pattern name" });
    await user.clear(name);
    await user.type(name, "Renamed Pattern");
    await user.click(screen.getByRole("button", { name: "Save pattern" }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        existing.id,
        expect.objectContaining({ name: "Renamed Pattern" }),
      ),
    );
  });
});
