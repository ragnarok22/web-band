import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { TempoTrainerPanel } from "@/components/practice/tempo-trainer-panel";
import type { TempoTrainerConfiguration } from "@/types/practice";

const initialConfiguration: TempoTrainerConfiguration = {
  endBpm: 120,
  increment: 5,
  interval: { measures: 4, type: "measures" },
  resetToStartingBpmOnStop: true,
  startBpm: 80,
  stopAtTarget: true,
};

function TempoHarness() {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  return (
    <>
      <TempoTrainerPanel
        configuration={configuration}
        onChange={setConfiguration}
      />
      <output aria-label="Current configuration">
        {JSON.stringify(configuration)}
      </output>
    </>
  );
}

describe("tempo trainer panel", () => {
  it("updates tempo, interval, and stop behavior through controlled fields", async () => {
    const user = userEvent.setup();
    render(<TempoHarness />);

    const startBpm = screen.getByRole("spinbutton", { name: "Start BPM" });
    await user.clear(startBpm);
    await user.type(startBpm, "96");
    await user.click(screen.getByRole("radio", { name: /seconds/i }));
    const interval = screen.getByRole("spinbutton", {
      name: "Interval length",
    });
    await user.clear(interval);
    await user.type(interval, "12");
    await user.click(screen.getByRole("checkbox", { name: "Stop at target" }));

    expect(screen.getByLabelText("Current configuration")).toHaveTextContent(
      '"startBpm":96',
    );
    expect(screen.getByLabelText("Current configuration")).toHaveTextContent(
      '"interval":{"seconds":12,"type":"seconds"}',
    );
    expect(screen.getByLabelText("Current configuration")).toHaveTextContent(
      '"stopAtTarget":false',
    );
  });

  it("keeps invalid values out of the configuration and explains the range", async () => {
    const user = userEvent.setup();
    render(<TempoHarness />);

    const target = screen.getByRole("spinbutton", { name: "Target BPM" });
    await user.clear(target);

    expect(target).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("40 to 220");
    expect(screen.getByLabelText("Current configuration")).toHaveTextContent(
      '"endBpm":120',
    );
  });
});
