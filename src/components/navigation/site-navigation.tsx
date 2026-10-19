"use client";

import { Drum, History, Info, LibraryBig, Menu, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDesktopLayout } from "@/hooks/use-desktop-layout";
import { usePracticeModal } from "@/hooks/use-practice-modal";
import { usePracticeUiStore } from "@/stores/practice-ui-store";

const navigationItems = [
  { href: "/practice", icon: Drum, label: "Practice" },
  { href: "/patterns", icon: LibraryBig, label: "Patterns" },
  { href: "/history", icon: History, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/about", icon: Info, label: "About" },
] as const;

export function SiteNavigation() {
  const pathname = usePathname();
  const isFocusMode = usePracticeUiStore((state) => state.isFocusMode);
  const desktop = useDesktopLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const showMenu = menuOpen && !desktop && !isFocusMode;
  useEffect(() => {
    const media = window.matchMedia?.("(min-width: 1024px)");
    const dismissMenu = () => setMenuOpen(false);
    media?.addEventListener("change", dismissMenu);
    return () => media?.removeEventListener("change", dismissMenu);
  }, []);
  usePracticeModal(showMenu);

  if (pathname === "/practice" && isFocusMode) return null;

  const links = navigationItems.map(({ href, icon: Icon, label }) => {
    const isActive = pathname === href;
    return (
      <Link
        aria-current={isActive ? "page" : undefined}
        className={`flex min-h-11 items-center gap-2.5 rounded-lg px-4 text-sm font-bold transition-colors ${isActive ? "bg-primary/12 text-primary" : "text-muted-strong hover:bg-surface-hover hover:text-foreground"}`}
        href={href}
        key={href}
        onClick={() => setMenuOpen(false)}
      >
        <Icon aria-hidden="true" className="size-[1.125rem]" />
        {label}
      </Link>
    );
  });

  return (
    <header className="border-border bg-background/95 sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex min-h-16 max-w-[100rem] items-center justify-between gap-6 px-3 sm:px-6 lg:justify-start lg:px-8"
      >
        <Link
          aria-label="Web Band home"
          className="text-foreground flex min-h-11 shrink-0 items-center gap-3 rounded-lg pr-2 font-extrabold tracking-tight"
          href="/practice"
        >
          <span className="border-primary/25 bg-primary/8 text-primary flex size-10 items-center justify-center rounded-xl border">
            <Drum aria-hidden="true" className="size-6" />
          </span>
          <span className="text-xl">Web Band</span>
        </Link>
        {desktop ? (
          <div className="flex items-center gap-1">{links}</div>
        ) : (
          <Sheet open={showMenu} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  aria-label="Open navigation"
                  variant="outline"
                  className="size-11"
                />
              }
            >
              <Menu aria-hidden="true" className="size-5" />
            </SheetTrigger>
            <SheetContent className="w-[min(22rem,100%)]">
              <SheetHeader className="border-border border-b pr-16">
                <SheetTitle>Web Band navigation</SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 p-3">{links}</div>
            </SheetContent>
          </Sheet>
        )}
      </nav>
    </header>
  );
}
