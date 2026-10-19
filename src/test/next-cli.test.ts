import { describe, expect, it } from "vitest";

import { scripts } from "../../package.json";

describe("Next.js CLI bundler selection", () => {
  it.each(["dev", "build", "typecheck"] as const)(
    "%s selects Webpack when loading the Serwist config",
    (script) => {
      const nextCommand = scripts[script].split("&&")[0]?.trim().split(/\s+/);

      expect(nextCommand).toContain("--webpack");
    },
  );
});
