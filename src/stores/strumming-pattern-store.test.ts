import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { quarterDownstrokesPattern } from "@/data/strumming-patterns";
import { storageService } from "@/db/storage-service";
import {
  useStrummingPatternStore,
  type StrummingPatternInput,
} from "@/stores/strumming-pattern-store";

function input(name = "Custom Downstrokes"): StrummingPatternInput {
  return {
    name,
    steps: quarterDownstrokesPattern.steps.map(({ accent, action }) => ({
      accent,
      action,
    })),
    subdivision: 8,
    timeSignature: { denominator: 4, numerator: 4 },
  };
}

beforeEach(async () => {
  storageService.close();
  vi.stubGlobal("indexedDB", undefined);
  useStrummingPatternStore.setState({
    customPatterns: [],
    isHydrated: false,
  });
  await storageService.initialize();
});

afterEach(() => {
  storageService.close();
  vi.unstubAllGlobals();
});

describe("strumming pattern store", () => {
  it("creates, updates, hydrates, and deletes custom patterns", async () => {
    const source = input();
    const created = await useStrummingPatternStore.getState().create(source);
    source.steps[0]!.action = "up";

    expect(created).toMatchObject({
      isBuiltIn: false,
      name: "Custom Downstrokes",
    });
    expect(created.steps[0]?.action).toBe("down");
    expect(new Set(created.steps.map(({ id }) => id)).size).toBe(
      created.steps.length,
    );

    const updated = await useStrummingPatternStore
      .getState()
      .update(created.id, {
        name: "Edited Downstrokes",
        steps: input().steps.map((step, index) => ({
          ...step,
          action: index === 1 ? "up" : step.action,
        })),
      });
    expect(updated.name).toBe("Edited Downstrokes");
    expect(updated.steps[1]?.action).toBe("up");
    expect(updated.createdAt).toBe(created.createdAt);

    useStrummingPatternStore.setState({
      customPatterns: [],
      isHydrated: false,
    });
    await useStrummingPatternStore.getState().hydrate();
    expect(useStrummingPatternStore.getState()).toMatchObject({
      customPatterns: [expect.objectContaining({ id: created.id })],
      isHydrated: true,
    });

    await useStrummingPatternStore.getState().delete(created.id);
    expect(useStrummingPatternStore.getState().customPatterns).toEqual([]);
    expect(
      await storageService.strummingPatternRepository.get(created.id),
    ).toBeUndefined();
  });

  it("rejects invalid writes without changing state", async () => {
    await expect(
      useStrummingPatternStore.getState().create({
        ...input(),
        name: "",
      }),
    ).rejects.toThrow("Only valid custom strumming patterns can be saved.");
    expect(useStrummingPatternStore.getState().customPatterns).toEqual([]);
  });

  it("refreshes restored repository records after backup import", async () => {
    const created = await useStrummingPatternStore
      .getState()
      .create(input("Restored Strum"));
    useStrummingPatternStore.setState({ customPatterns: [] });

    await useStrummingPatternStore.getState().refreshAfterImport();

    expect(useStrummingPatternStore.getState().customPatterns).toEqual([
      created,
    ]);
  });
});
