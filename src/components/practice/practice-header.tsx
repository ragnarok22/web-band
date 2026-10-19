import type { ReactNode } from "react";

export function PracticeHeader({ actions }: { actions: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 py-4 sm:py-5">
      <div>
        <h1 className="text-foreground text-xl font-extrabold tracking-tight sm:text-2xl">
          Practice room
        </h1>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
    </header>
  );
}
