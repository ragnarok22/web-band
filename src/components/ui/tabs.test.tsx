import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import * as tabsModule from "@/components/ui/tabs";

const { Tabs, TabsList, TabsTrigger, TabsContent } = tabsModule;

describe("tabs", () => {
  it("exports only components to preserve its Fast Refresh boundary", () => {
    expect(Object.keys(tabsModule).sort()).toEqual([
      "Tabs",
      "TabsContent",
      "TabsList",
      "TabsTrigger",
    ]);
  });

  it("keeps the default list variant and slot", () => {
    render(
      <Tabs defaultValue="practice">
        <TabsList aria-label="Sections">
          <TabsTrigger value="practice">Practice</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const list = screen.getByRole("tablist", { name: "Sections" });
    expect(list).toHaveAttribute("data-slot", "tabs-list");
    expect(list).toHaveAttribute("data-variant", "default");
    expect(list).toHaveClass("bg-muted");
  });

  it("keeps the line variant, custom classes, and tab selection", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="practice">
        <TabsList aria-label="Sections" className="custom-tabs" variant="line">
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="practice">Practice room</TabsContent>
        <TabsContent value="history">Practice journal</TabsContent>
      </Tabs>,
    );

    const list = screen.getByRole("tablist", { name: "Sections" });
    expect(list).toHaveAttribute("data-variant", "line");
    expect(list).toHaveClass("bg-transparent", "gap-1", "custom-tabs");
    expect(list).not.toHaveClass("bg-muted");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Practice room");

    await user.click(screen.getByRole("tab", { name: "History" }));

    expect(screen.getByRole("tab", { name: "History" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Practice journal");
  });
});
