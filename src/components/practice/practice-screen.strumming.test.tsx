import { setupPracticeScreenTests } from "./practice-screen.test-support";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { guidanceTimeline } from "@/audio/guidance-timeline";
import { PracticeScreen } from "@/components/practice/practice-screen";
import {
  basicPopPattern,
  quarterDownstrokesPattern,
} from "@/data/strumming-patterns";
import { getStrumPosition } from "@/lib/guided-practice";
import { useAudioStore } from "@/stores/audio-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { usePracticeStore } from "@/stores/practice-store";
import { renderWithMotion as render } from "@/test/render-with-motion";

describe("integrated strumming practice", () => {
  setupPracticeScreenTests();

  it("places pattern controls and exactly one rhythm timeline inside the player", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.setState({ mode: "strumming" });
    render(<PracticeScreen />);
    const player = within(
      screen.getByRole("region", { name: "Practice player" }),
    );

    expect(
      screen.getAllByRole("list", { name: /action sequence/ }),
    ).toHaveLength(1);
    expect(
      player.getByRole("combobox", { name: /Pattern for 4\/4/ }),
    ).toBeVisible();
    expect(player.getByRole("button", { name: "New" })).toBeEnabled();
    expect(
      screen.queryByRole("region", { name: "Beat visualization" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Strumming trainer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Drum accompaniment" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Change Groove" })).toBeVisible();

    await user.selectOptions(
      player.getByRole("combobox", { name: /Pattern for 4\/4/ }),
      basicPopPattern.id,
    );
    expect(useGuidedPracticeStore.getState().strummingPattern.id).toBe(
      basicPopPattern.id,
    );
    expect(
      screen.getAllByRole("list", { name: /action sequence/ }),
    ).toHaveLength(1);
    expect(player.getAllByRole("listitem", { name: /Step/ })).toHaveLength(16);
    expect(usePracticeStore.getState().selectedPatternId).toBe("basic-rock");
    expect(screen.getByRole("button", { name: "Controls" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("clears playing highlights on pause and stop while retaining the paused action", () => {
    useGuidedPracticeStore.setState({
      mode: "strumming",
      strummingPattern: basicPopPattern,
    });
    useAudioStore.setState({ status: "playing" });
    guidanceTimeline.begin();
    guidanceTimeline.publish({
      absoluteSixteenth: 4,
      elapsedSeconds: 0.5,
      measure: 1,
      mode: "strumming",
      position: getStrumPosition(basicPopPattern, 4),
    });
    render(<PracticeScreen />);
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);

    act(() => useAudioStore.setState({ status: "paused" }));
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(0);
    expect(
      within(screen.getByRole("group", { name: "Current action" })).getByText(
        "Mute",
      ),
    ).toBeVisible();
    act(() => useAudioStore.setState({ status: "playing" }));
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    act(() => {
      guidanceTimeline.reset();
      useAudioStore.setState({ status: "stopped" });
    });
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(0);
    expect(
      within(screen.getByRole("group", { name: "Current action" })).getByText(
        "Down",
      ),
    ).toBeVisible();
  });

  it("uses the same single timeline in Focus and hides pattern management", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.setState({ mode: "strumming" });
    useAudioStore.setState({ status: "playing" });
    guidanceTimeline.begin();
    guidanceTimeline.publish({
      absoluteSixteenth: 2,
      elapsedSeconds: 0.25,
      measure: 1,
      mode: "strumming",
      position: getStrumPosition(quarterDownstrokesPattern, 2),
    });
    render(<PracticeScreen />);
    await user.click(screen.getByRole("button", { name: "Focus" }));
    expect(
      screen.getAllByRole("list", { name: /action sequence/ }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("region", { name: "Beat visualization" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /Pattern for/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      quarterDownstrokesPattern.name,
    );
    expect(document.querySelector('[aria-current="step"]')).toHaveAttribute(
      "data-position",
      "&",
    );
    await user.click(screen.getByRole("button", { name: "Exit focus" }));
    expect(
      screen.getAllByRole("list", { name: /action sequence/ }),
    ).toHaveLength(1);
    expect(document.querySelector('[aria-current="step"]')).toHaveAttribute(
      "data-position",
      "&",
    );
  });

  it("lets keyboard users scroll the timeline without triggering groove shortcuts", async () => {
    const user = userEvent.setup();
    useGuidedPracticeStore.setState({ mode: "strumming" });
    render(<PracticeScreen />);
    screen.getByRole("region", { name: "Strumming timeline" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(usePracticeStore.getState().selectedPatternId).toBe("basic-rock");
    await user.keyboard("{ArrowLeft}");
    expect(usePracticeStore.getState().selectedPatternId).toBe("basic-rock");
  });
});
