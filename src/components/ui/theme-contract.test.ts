import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function componentFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory())
      return entry.name === "ui" ? [] : componentFiles(path);
    return path.endsWith(".tsx") && !path.includes(".test.") ? [path] : [];
  });
}

describe("warm shadcn theme", () => {
  it("never renders copy with a muted surface token or brand actions with an accent surface token", () => {
    // These utilities became nearly black on dark panels after shadcn introduced
    // semantic surface tokens. Custom music visuals must migrate with the forms.
    const legacyColors =
      /(?<![\w-])text-muted(?![\w-])|(?<![\w-])(?:bg|text|border|outline|ring|accent|fill|stroke)-accent(?![\w-])|var\(--accent\)/;
    const offenders = componentFiles(join(process.cwd(), "src/components"))
      .filter((path) => legacyColors.test(readFileSync(path, "utf8")))
      .map((path) => path.replace(`${process.cwd()}/`, ""));
    expect(offenders).toEqual([]);
  });
});
