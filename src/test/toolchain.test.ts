import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

describe("toolchain compatibility", () => {
  it("loads the ESLint configuration with the installed TypeScript compiler", () => {
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", "await import('./eslint.config.mjs')"],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status, result.stderr).toBe(0);
  });
});
