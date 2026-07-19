import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DataBackupPanel,
  type DataBackupActions,
} from "@/components/data/data-backup-panel";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import {
  createBackupEnvelope,
  defaultBackupPreferences,
  serializeBackupEnvelope,
} from "@/lib/backup-envelope";
import { createDefaultGuidedPracticeValues } from "@/stores/guided-practice-store";
import type { BackupEnvelope, ImportMode } from "@/types/persistence";

function envelope(): BackupEnvelope {
  return createBackupEnvelope(
    {
      customChordProgressions: [],
      customPatterns: [],
      customStrummingPatterns: [],
      favoriteChordProgressionIds: [],
      favoritePatternIds: ["basic-rock"],
      practicePresets: [],
      practiceSessions: [],
    },
    {
      guidedPractice: createDefaultGuidedPracticeValues(),
      history: { enabled: true, minimumDurationSeconds: 30 },
      practice: structuredClone(defaultPracticeSettings),
    },
    defaultBackupPreferences,
    new Date("2026-07-18T12:00:00.000Z"),
  );
}

function backupFile(contents: string, name = "web-band-backup.json"): File {
  const file = new File([contents], name, { type: "application/json" });
  Object.defineProperty(file, "text", {
    value: vi.fn(async () => contents),
  });
  return file;
}

function actions(): DataBackupActions {
  return {
    exportCurrentBackup: vi.fn(async () => envelope()),
    importBackup: vi.fn(async (_value: unknown, mode: ImportMode) => ({
      imported: {
        customChordProgressions: 0,
        customPatterns: 0,
        customStrummingPatterns: 0,
        favoriteChordProgressionIds: 0,
        favoritePatternIds: 1,
        practicePresets: 0,
        practiceSessions: 0,
      },
      mode,
      settingsPersisted: true,
      totalImported: 1,
      warning: null,
    })),
  };
}

describe("data backup panel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("previews a valid file and imports it with merge by default", async () => {
    const user = userEvent.setup();
    const backupActions = actions();
    render(<DataBackupPanel actions={backupActions} />);

    await user.upload(
      screen.getByLabelText("Choose backup file"),
      backupFile(serializeBackupEnvelope(envelope())),
    );

    expect(
      await screen.findByRole("dialog", { name: "Review backup" }),
    ).toBeVisible();
    expect(screen.getByText("Favorite patterns")).toBeVisible();
    expect(screen.getByText("1", { selector: "dd" })).toBeVisible();
    expect(document.querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-07-18T12:00:00.000Z",
    );
    await user.click(screen.getByRole("button", { name: "Import data" }));

    await waitFor(() =>
      expect(backupActions.importBackup).toHaveBeenCalledWith(
        envelope(),
        "merge",
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "1 record imported by merge",
    );
    expect(screen.getByRole("button", { name: "Import backup" })).toHaveFocus();
  });

  it("shows an invalid-file error without offering an import", async () => {
    const user = userEvent.setup();
    const backupActions = actions();
    render(<DataBackupPanel actions={backupActions} />);

    await user.upload(
      screen.getByLabelText("Choose backup file"),
      backupFile("not-json", "invalid.json"),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("valid JSON");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(backupActions.importBackup).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before replace import", async () => {
    const user = userEvent.setup();
    const backupActions = actions();
    render(<DataBackupPanel actions={backupActions} />);
    await user.upload(
      screen.getByLabelText("Choose backup file"),
      backupFile(serializeBackupEnvelope(envelope())),
    );

    await user.click(
      await screen.findByRole("radio", { name: /Replace current data/ }),
    );
    expect(
      screen.getByText(/safety backup download is started before replacement/i),
    ).toBeVisible();
    const importButton = screen.getByRole("button", { name: "Import data" });
    expect(importButton).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: "I understand current data will be replaced",
      }),
    );
    expect(importButton).toBeEnabled();
    await user.click(importButton);

    await waitFor(() =>
      expect(backupActions.importBackup).toHaveBeenCalledWith(
        envelope(),
        "replace",
      ),
    );
  });

  it("exports from an explicit button action", async () => {
    const user = userEvent.setup();
    const backupActions = actions();
    render(<DataBackupPanel actions={backupActions} />);

    await user.click(screen.getByRole("button", { name: "Export data" }));

    expect(backupActions.exportCurrentBackup).toHaveBeenCalledOnce();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Backup download started",
    );
  });
});
