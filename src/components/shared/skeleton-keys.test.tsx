import { Children, isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { PracticeSkeleton } from "@/components/practice/practice-skeleton";
import { SettingsSkeleton } from "@/components/settings/settings-skeleton";

function collectKeys(node: ReactNode): string[] {
  const keys: string[] = [];
  Children.forEach(node, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return;
    if (child.key !== null) keys.push(String(child.key));
    keys.push(...collectKeys(child.props.children));
  });
  return keys;
}

describe("skeleton list identity", () => {
  it("keys practice mode placeholders by mode, not position or shared width", () => {
    expect(collectKeys(PracticeSkeleton())).toEqual(
      expect.arrayContaining([
        "drums",
        "strumming",
        "chords",
        "tempoTrainer",
        "metronome",
      ]),
    );
  });

  it("keys settings cards by section, not position or shared row count", () => {
    expect(collectKeys(SettingsSkeleton())).toEqual(
      expect.arrayContaining([
        "appearance",
        "practice-defaults",
        "sound",
        "history",
      ]),
    );
  });
});
