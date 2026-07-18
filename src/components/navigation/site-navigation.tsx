"use client";

import { Drum, History, LibraryBig, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { usePracticeUiStore } from "@/stores/practice-ui-store";

const navigationItems = [
  { href: "/practice", icon: Drum, label: "Practice" },
  { href: "/patterns", icon: LibraryBig, label: "Patterns" },
  { href: "/history", icon: History, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

export function SiteNavigation() {
  const pathname = usePathname();
  const isFocusMode = usePracticeUiStore((state) => state.isFocusMode);

  if (pathname === "/practice" && isFocusMode) return null;

  return (
    <nav
      aria-label="Primary navigation"
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:inset-y-0 lg:right-auto lg:flex lg:w-[calc(5rem+env(safe-area-inset-left))] lg:flex-col lg:border-t-0 lg:border-r lg:pt-[max(1rem,env(safe-area-inset-top))] lg:pr-2 lg:pb-4 lg:pl-[max(0.5rem,env(safe-area-inset-left))]"
    >
      <div className="hidden items-center justify-center pb-6 lg:flex">
        <span className="border-accent/25 bg-accent/10 text-accent flex size-11 items-center justify-center rounded-xl border">
          <Drum aria-hidden="true" className="size-6" />
        </span>
      </div>
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 sm:gap-2 lg:mx-0 lg:flex lg:flex-1 lg:flex-col">
        {navigationItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-extrabold transition-colors lg:min-h-16 lg:text-xs ${isActive ? "bg-accent text-accent-ink" : "text-muted-strong hover:bg-surface-hover hover:text-foreground"}`}
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
