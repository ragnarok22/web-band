import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

export async function openPresetMenu(user: ReturnType<typeof userEvent.setup>) {
  // Keyboard opening is deterministic in jsdom, which has no popup geometry.
  screen.getByRole("button", { name: "Open presets" }).focus();
  await user.keyboard("{ArrowDown}");
}
