import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AboutScreen } from "@/components/about/about-screen";

describe("about screen", () => {
  it("introduces guitar rhythm practice with actions at the start and end", () => {
    render(<AboutScreen />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Practice guitar. Find your rhythm.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/rhythm practice companion for guitarists/),
    ).toBeInTheDocument();

    for (const [name, href] of [
      ["Start Practicing", "/practice"],
      ["Explore Grooves", "/patterns"],
    ]) {
      const links = screen.getAllByRole("link", { name });
      expect(links).toHaveLength(2);
      for (const link of links) expect(link).toHaveAttribute("href", href);
      expect(links[0].closest("header")).not.toBeNull();
      expect(
        within(
          screen.getByRole("region", { name: "Less reading. More playing." }),
        ).getByRole("link", { name }),
      ).toHaveAttribute("href", href);
    }
  });

  it("represents all five implemented practice experiences without fake mode links", () => {
    render(<AboutScreen />);
    const features = screen.getByRole("region", {
      name: "Everything you need to find your rhythm.",
    });

    expect(within(features).getAllByRole("listitem")).toHaveLength(5);
    for (const title of [
      "Drum Grooves",
      "Strumming Practice",
      "Chord Progressions",
      "Tempo Training",
      "Metronome",
    ]) {
      expect(
        within(features).getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
    }
    expect(
      within(features).getByText(/visual strumming patterns/),
    ).toBeInTheDocument();
    expect(
      within(features).getByText(
        /chord changes with synchronized visual guidance/,
      ),
    ).toBeInTheDocument();
    expect(
      within(features).getByText(/increase or decrease/),
    ).toBeInTheDocument();
    expect(
      within(features).getByText(/timing, accents, and rhythmic subdivisions/),
    ).toBeInTheDocument();
    expect(within(features).queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Save your practice setups as presets/),
    ).toBeInTheDocument();
  });

  it("explains setup in three user-focused steps", () => {
    render(<AboutScreen />);
    const workflow = screen.getByRole("region", {
      name: "From setup to practice in seconds.",
    });

    expect(within(workflow).getAllByRole("listitem")).toHaveLength(3);
    for (const title of [
      "Choose Your Practice",
      "Set Your Pace",
      "Press Play",
    ]) {
      expect(
        within(workflow).getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
    }
  });

  it("explains local storage limitations, backups, and conditional offline use", () => {
    render(<AboutScreen />);
    const localData = screen.getByRole("region", {
      name: "Your practice. Your data.",
    });

    expect(
      within(localData).getByText(/patterns, presets, and practice history/),
    ).toBeInTheDocument();
    expect(
      within(localData).getByText(/No account required/),
    ).toBeInTheDocument();
    expect(
      within(localData).getByText(
        /Browser storage can be cleared or unavailable/,
      ),
    ).toBeInTheDocument();
    expect(
      within(localData).getByRole("link", {
        name: "Manage backups in Settings",
      }),
    ).toHaveAttribute("href", "/settings");
    expect(
      within(localData).getByText(/Export or import backups/),
    ).toBeInTheDocument();
    expect(
      within(localData).getByText(
        /Once the app and required resources are cached/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Once installed/)).not.toBeInTheDocument();
  });

  it("removes the old statistics and hides decorative artwork from assistive technology", () => {
    const { container } = render(<AboutScreen />);

    expect(container.querySelector("dl")).toBeNull();
    expect(
      screen.queryByText(/44|100%|audio files|supported meters/),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("keeps technical details secondary and supports pointer and keyboard disclosure", async () => {
    const user = userEvent.setup();
    render(<AboutScreen />);
    const trigger = screen.getByRole("button", { name: "How Web Band works" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("heading", { name: "Accurate Musical Timing" }),
    ).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    for (const title of [
      "Accurate Musical Timing",
      "Synthesized Drum Sounds",
      "Browser-Based Application",
    ]) {
      expect(
        screen.getByRole("heading", { level: 3, name: title }),
      ).toBeVisible();
    }
    expect(
      screen.getByText(
        /Tone.js schedules musical events against the audio clock/,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(/Web Audio API instead of prerecorded drum samples/),
    ).toBeVisible();

    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("heading", { name: "Accurate Musical Timing" }),
    ).not.toBeInTheDocument();
    await user.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
