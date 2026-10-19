import { AudioLines } from "lucide-react";
import { m } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";

import { useAppReducedMotion } from "@/components/motion/app-motion-provider";
import {
  motionTransition,
  panelEntry,
  settled,
} from "@/components/motion/motion-presets";
import { formatPatternCategory } from "@/lib/pattern-filters";
import type { DrumPattern } from "@/types/pattern";

interface PatternSummaryProps {
  immediatePatternSwitch: boolean;
  onImmediatePatternSwitchChange: (enabled: boolean) => void;
  onPatternChange: (patternId: string) => void;
  pattern: DrumPattern;
  patterns: DrumPattern[];
  pendingPatternId: string | null;
  swing: number;
}

export function PatternSummary({
  immediatePatternSwitch,
  onImmediatePatternSwitchChange,
  onPatternChange,
  pattern,
  patterns,
  pendingPatternId,
  swing,
}: PatternSummaryProps) {
  const reducedMotion = useAppReducedMotion();
  const selectedPattern =
    patterns.find(({ id }) => id === (pendingPatternId ?? pattern.id)) ??
    pattern;

  return (
    <Card className="relative gap-0 p-5">
      <div
        aria-hidden="true"
        className="bg-primary/8 absolute -top-20 -right-20 size-48 rounded-full blur-3xl"
      />
      <div className="relative">
        <m.div
          animate={settled}
          data-motion="pattern-selection"
          data-motion-reduced={reducedMotion}
          initial={reducedMotion ? false : panelEntry}
          key={pattern.id}
          transition={motionTransition(reducedMotion, 0.12)}
        >
          <div className="mb-6 flex items-center justify-between">
            <Badge
              variant="outline"
              className="border-primary/25 bg-primary/10 text-primary tracking-[0.12em] uppercase"
            >
              {formatPatternCategory(pattern.category)}
            </Badge>
            <AudioLines
              aria-hidden="true"
              className="text-muted-foreground size-5"
            />
          </div>
          <p className="text-muted-foreground text-xs font-bold tracking-[0.16em] uppercase">
            Current pattern
          </p>
          <h1 className="text-foreground mt-2 text-3xl font-black tracking-[-0.045em]">
            {pattern.name}
          </h1>
        </m.div>
        <div className="mt-4">
          <label
            htmlFor="quick-pattern-select"
            className="text-muted-foreground mb-1 block text-[0.65rem] font-extrabold tracking-wider uppercase"
          >
            Quick select
          </label>
          <Combobox
            items={patterns}
            value={selectedPattern}
            itemToStringLabel={formatQuickPattern}
            itemToStringValue={(item: DrumPattern) => item.id}
            isItemEqualToValue={(item, value) => item.id === value.id}
            onValueChange={(item) => {
              if (item) onPatternChange(item.id);
            }}
            autoHighlight
          >
            <ComboboxInput
              id="quick-pattern-select"
              aria-label="Current pattern"
              placeholder="Search patterns…"
              className="min-h-11 w-full [&_input]:min-h-11"
            />
            <ComboboxContent>
              <ComboboxEmpty>No patterns found.</ComboboxEmpty>
              <ComboboxList>
                {(candidate: DrumPattern) => (
                  <ComboboxItem
                    key={candidate.id}
                    value={candidate}
                    className="min-h-11"
                  >
                    {formatQuickPattern(candidate)}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        {pendingPatternId ? (
          <p className="text-secondary-accent mt-2 text-xs font-bold">
            Queued after a transition fill
          </p>
        ) : null}
        <label className="text-muted-strong mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-xs leading-5 font-bold">
          <Checkbox
            checked={immediatePatternSwitch}
            onCheckedChange={onImmediatePatternSwitchChange}
          />
          <span>Switch same-meter patterns immediately</span>
        </label>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {pattern.description}
        </p>
        <dl className="border-border mt-6 grid grid-cols-2 gap-3 border-t pt-4">
          <div>
            <dt className="text-muted-foreground text-[0.68rem] font-bold tracking-wider uppercase">
              Meter
            </dt>
            <dd className="text-foreground mt-1 font-extrabold tabular-nums">
              {pattern.timeSignature.numerator}/
              {pattern.timeSignature.denominator}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[0.68rem] font-bold tracking-wider uppercase">
              Feel
            </dt>
            <dd className="text-foreground mt-1 font-extrabold">
              {swing > 0 ? "Swing" : "Straight"} {pattern.subdivision}ths
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

function formatQuickPattern(pattern: DrumPattern): string {
  return `${pattern.name} - ${pattern.timeSignature.numerator}/${pattern.timeSignature.denominator}`;
}
