import type { Metadata } from "next";

import { SettingsShell } from "@/components/settings/settings-shell";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage local practice history, backups, and device data.",
};

export default function SettingsPage() {
  return <SettingsShell />;
}
