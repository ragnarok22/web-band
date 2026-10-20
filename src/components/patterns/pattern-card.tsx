"use client";

import { ArrowRight, ChevronDown, Heart, Play, Square } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { PatternActionsMenu } from "@/components/patterns/pattern-actions-menu";
import { RhythmPreview } from "@/components/patterns/rhythm-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatPatternCategory,
  getTimeSignatureLabel,
} from "@/lib/pattern-filters";
import type { DrumPattern, PatternDifficulty } from "@/types/pattern";
import type { AudioEngineStatus } from "@/types/audio";

interface PatternCardProps {
  favoriteDisabled?: boolean;
  isFavorite: boolean;
  isPreviewing: boolean;
  previewStatus?: AudioEngineStatus;
  onFavorite: () => void;
  onOpen: () => void;
  onPreview: () => void;
  pattern: DrumPattern;
}

const difficultyStyles: Record<PatternDifficulty, string> = {
  beginner: "border-success/20 bg-success/8 text-foreground",
  intermediate: "border-primary/20 bg-primary/8 text-foreground",
  advanced: "border-border-strong bg-surface-elevated text-foreground",
};

export function PatternCard({
  favoriteDisabled = false,
  isFavorite,
  isPreviewing,
  previewStatus = "playing",
  onFavorite,
  onOpen,
  onPreview,
  pattern,
}: PatternCardProps) {
  const titleId = useId();

  return (
    <Card
      as="article"
      aria-labelledby={titleId}
      data-previewing={isPreviewing || undefined}
      className={`min-w-0 gap-0 p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 ${isPreviewing ? "ring-primary/60 ring-2" : "hover:ring-border-strong"}`}
      tabIndex={-1}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-primary text-[0.65rem] font-extrabold tracking-[0.1em] uppercase">
            {formatPatternCategory(pattern.category)}
          </span>
          <Badge
            className={`text-[0.65rem] capitalize ${difficultyStyles[pattern.difficulty]}`}
            variant="outline"
          >
            {pattern.difficulty}
          </Badge>
          {!pattern.isBuiltIn ? (
            <span className="text-muted-foreground text-[0.65rem]">
              Your pattern
            </span>
          ) : null}
        </div>
        <div className="-mr-2 flex shrink-0">
          <Button
            aria-label={`${pattern.name} favorite`}
            aria-pressed={isFavorite}
            className={`size-11 shrink-0 rounded-lg ${isFavorite ? "text-secondary-accent bg-secondary-accent/10" : "text-muted-foreground"}`}
            disabled={favoriteDisabled}
            onClick={onFavorite}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Heart
              aria-hidden="true"
              className={`size-4 ${isFavorite ? "fill-current" : ""}`}
            />
          </Button>
          <PatternActionsMenu pattern={pattern} />
        </div>
      </div>

      <h2
        className="text-foreground mt-1 text-xl font-black tracking-[-0.03em] [overflow-wrap:anywhere] break-words"
        id={titleId}
      >
        {pattern.name}
      </h2>
      <p className="text-muted-foreground mt-1 line-clamp-2 min-h-10 text-sm leading-5 [overflow-wrap:anywhere] break-words">
        {pattern.description}
      </p>

      <Collapsible className="my-1">
        <div className="flex flex-wrap items-center gap-x-3">
          <PatternTerm
            label={`Time signature: ${getTimeSignatureLabel(pattern)}`}
            explanation="Time signature groups beats into each measure. 4/4 has four quarter-note beats."
          >
            {getTimeSignatureLabel(pattern)}
          </PatternTerm>
          <PatternTerm
            label={`Default tempo: ${pattern.defaultBpm} BPM`}
            explanation="BPM means beats per minute. A higher number means a faster rhythm."
          >
            {pattern.defaultBpm}{" "}
            <span className="text-muted-foreground text-[0.65rem] font-medium">
              BPM
            </span>
          </PatternTerm>
          <CollapsibleTrigger
            aria-label={`${pattern.name} Details`}
            render={
              <Button
                className="text-muted-strong aria-expanded:border-primary/40 aria-expanded:bg-primary/8 aria-expanded:text-primary ml-auto min-h-11 gap-1.5 rounded-lg px-3 text-sm font-semibold aria-expanded:[&_svg]:rotate-180"
                variant="outline"
              />
            }
          >
            <span className="sr-only">{pattern.name} </span>Details
            <ChevronDown aria-hidden="true" className="size-3.5" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="border-border mt-2 border-t pt-3">
            <h3 className="text-foreground text-xs font-bold">
              About this groove
            </h3>
            <p className="text-muted-foreground mt-1 mb-3 text-sm leading-5 wrap-anywhere">
              {pattern.description}
            </p>
            <dl className="mb-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Recommended</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {pattern.recommendedBpmRange.min}-
                  {pattern.recommendedBpmRange.max} BPM
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Subdivision / grid</dt>
                <dd>
                  <PatternTerm
                    label={`Subdivision: ${pattern.subdivision === 8 ? "Eighth notes" : "Sixteenth notes"}`}
                    explanation="Subdivision splits each beat into smaller steps. Eighth notes give two steps per quarter-note beat; sixteenth notes give four."
                  >
                    {pattern.subdivision === 8
                      ? "Eighth notes"
                      : "Sixteenth notes"}
                  </PatternTerm>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Length</dt>
                <dd className="mt-1 font-semibold">
                  {pattern.bars} {pattern.bars === 1 ? "measure" : "measures"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="mt-1 font-semibold">
                  {pattern.isBuiltIn ? "Built-in pattern" : "Your pattern"}
                </dd>
              </div>
              {pattern.swing ? (
                <div>
                  <dt className="text-muted-foreground">Swing</dt>
                  <dd className="mt-1 font-semibold">
                    {Math.round(pattern.swing * 100)}%
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="mt-auto pt-1">
        <RhythmPreview
          isPreviewing={isPreviewing}
          pattern={pattern}
          status={previewStatus}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          aria-label={`${isPreviewing ? "Stop " : ""}${pattern.name} preview`}
          aria-pressed={isPreviewing}
          className="min-h-11 gap-2 rounded-xl text-sm font-bold"
          onClick={onPreview}
          type="button"
          variant="outline"
        >
          {isPreviewing ? (
            <Square aria-hidden="true" className="size-3.5 fill-current" />
          ) : (
            <Play aria-hidden="true" className="size-3.5 fill-current" />
          )}
          {isPreviewing ? "Stop" : "Preview"}
        </Button>
        <Button
          className="bg-primary text-accent-ink hover:bg-accent-strong min-h-11 gap-2 rounded-xl text-sm font-extrabold"
          onClick={onOpen}
          type="button"
        >
          Practice <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </Card>
  );
}

function PatternTerm({
  children,
  explanation,
  label,
}: {
  children: ReactNode;
  explanation: string;
  label: string;
}) {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Tooltip open={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger
        aria-label={label}
        aria-describedby={isOpen ? tooltipId : undefined}
        closeOnClick={false}
        className="text-foreground decoration-border-strong min-h-11 min-w-11 rounded-md text-left text-sm font-bold tabular-nums underline decoration-dotted underline-offset-4"
        onClick={() => setIsOpen((open) => !open)}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent id={tooltipId} role="tooltip">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}
