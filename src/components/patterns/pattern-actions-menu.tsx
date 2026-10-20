"use client";

import { Copy, Download, Ellipsis, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isCustomDrumPattern } from "@/lib/persistence-validation";
import { createPatternShareEnvelope } from "@/lib/pattern-sharing";
import { downloadPatternShareEnvelope } from "@/lib/pattern-sharing-browser";
import type { DrumPattern } from "@/types/pattern";

export function PatternActionsMenu({ pattern }: { pattern: DrumPattern }) {
  const [announcement, setAnnouncement] = useState<{
    isError: boolean;
    message: string;
  } | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`More actions for ${pattern.name}`}
              className="text-muted-foreground size-11 shrink-0"
              size="icon"
              variant="ghost"
            />
          }
        >
          <Ellipsis aria-hidden="true" className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            aria-label={`${pattern.isBuiltIn ? "Duplicate" : "Edit"} ${pattern.name}`}
            className="min-h-11 gap-2 px-3"
            render={
              <Link
                href={`/editor?${pattern.isBuiltIn ? "duplicate" : "pattern"}=${encodeURIComponent(pattern.id)}`}
              />
            }
          >
            {pattern.isBuiltIn ? (
              <Copy aria-hidden="true" />
            ) : (
              <Pencil aria-hidden="true" />
            )}
            {pattern.isBuiltIn ? "Duplicate" : "Edit"}
          </DropdownMenuItem>
          {isCustomDrumPattern(pattern) ? (
            <DropdownMenuItem
              aria-label={`Export ${pattern.name} pattern`}
              className="min-h-11 gap-2 px-3"
              onClick={() => {
                try {
                  downloadPatternShareEnvelope(
                    createPatternShareEnvelope([pattern]),
                  );
                  setAnnouncement({
                    isError: false,
                    message: `${pattern.name} pattern download started.`,
                  });
                } catch {
                  setAnnouncement({
                    isError: true,
                    message:
                      "Pattern could not be exported. Check your browser download permissions and try again.",
                  });
                }
              }}
            >
              <Download aria-hidden="true" />
              Export pattern
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <span
        aria-live={announcement?.isError ? "assertive" : "polite"}
        className="sr-only"
        role={announcement?.isError ? "alert" : undefined}
      >
        {announcement?.message}
      </span>
    </>
  );
}
