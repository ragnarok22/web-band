import type { EntityTable } from "dexie";

import {
  cloneValidRecords,
  type ReportCorruptRows,
} from "@/db/repositories/repository-helpers";
import { isPracticeSession } from "@/lib/persistence-validation";
import type { PracticeSession } from "@/types/persistence";

export interface PracticeSessionRepository {
  clear(): Promise<void>;
  delete(sessionId: string): Promise<void>;
  list(): Promise<PracticeSession[]>;
  put(session: PracticeSession): Promise<void>;
}

function assertSessionId(sessionId: string): void {
  if (!sessionId.trim() || sessionId.length > 128) {
    throw new Error("Practice session ID is invalid.");
  }
}

function sortSessions(sessions: PracticeSession[]): PracticeSession[] {
  return sessions.sort(
    (left, right) =>
      right.startedAt.localeCompare(left.startedAt) ||
      left.id.localeCompare(right.id),
  );
}

export class DexiePracticeSessionRepository implements PracticeSessionRepository {
  constructor(
    private readonly table: EntityTable<PracticeSession, "id">,
    private readonly reportCorruptRows?: ReportCorruptRows,
  ) {}

  async clear(): Promise<void> {
    await this.table.clear();
  }

  async delete(sessionId: string): Promise<void> {
    assertSessionId(sessionId);
    await this.table.delete(sessionId);
  }

  async list(): Promise<PracticeSession[]> {
    const sessions = await this.table.toArray();
    return sortSessions(
      cloneValidRecords(sessions, isPracticeSession, this.reportCorruptRows),
    );
  }

  async put(session: PracticeSession): Promise<void> {
    if (!isPracticeSession(session)) {
      throw new Error("Only valid practice sessions can be saved.");
    }
    await this.table.put(structuredClone(session));
  }
}

export class MemoryPracticeSessionRepository implements PracticeSessionRepository {
  private readonly sessions = new Map<string, PracticeSession>();

  async clear(): Promise<void> {
    this.sessions.clear();
  }

  async delete(sessionId: string): Promise<void> {
    assertSessionId(sessionId);
    this.sessions.delete(sessionId);
  }

  async list(): Promise<PracticeSession[]> {
    return sortSessions(
      cloneValidRecords(Array.from(this.sessions.values()), isPracticeSession),
    );
  }

  async put(session: PracticeSession): Promise<void> {
    if (!isPracticeSession(session)) {
      throw new Error("Only valid practice sessions can be saved.");
    }
    this.sessions.set(session.id, structuredClone(session));
  }
}
