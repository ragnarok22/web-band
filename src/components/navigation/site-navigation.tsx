"use client";

import { Drum, LibraryBig } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { usePracticeUiStore } from "@/stores/practice-ui-store";

const navigationItems = [
  { href: "/practice", icon: Drum, label: "Practice" },
  { href: "/patterns", icon: LibraryBig, label: "Patterns" },
] as const;

export function SiteNavigation() {
  const pathname = usePathname();
  const isFocusMode = usePracticeUiStore((state) => state.isFocusMode);

  if (pathname === "/practice" && isFocusMode) return null;

  return (
    <nav
      aria-label="Primary navigation"
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:inset-y-0 lg:right-auto lg:flex lg:w-20 lg:flex-col lg:border-t-0 lg:border-r lg:px-2 lg:py-4"
    >
      <div className="hidden items-center justify-center pb-6 lg:flex">
        <span className="border-accent/25 bg-accent/10 text-accent flex size-11 items-center justify-center rounded-xl border">
          <Drum aria-hidden="true" className="size-6" />
        </span>
      </div>
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-2 lg:mx-0 lg:flex lg:flex-1 lg:flex-col">
        {navigationItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-xs font-extrabold transition-colors lg:min-h-16 lg:flex-col lg:gap-1 ${isActive ? "bg-accent text-accent-ink" : "text-muted-strong hover:bg-surface-hover hover:text-foreground"}`}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
