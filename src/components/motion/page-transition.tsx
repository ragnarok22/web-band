"use client";

import { m } from "framer-motion";
import type { ReactNode } from "react";

import { useAppReducedMotion } from "@/components/motion/app-motion-provider";
import {
  motionTransition,
  pageEntry,
  settled,
} from "@/components/motion/motion-presets";

export function PageTransition({ children }: { children: ReactNode }) {
  const reducedMotion = useAppReducedMotion();

  return (
    <m.div
      animate={settled}
      data-motion="page"
      data-motion-reduced={reducedMotion}
      initial={reducedMotion ? false : pageEntry}
      transition={motionTransition(reducedMotion, 0.14)}
    >
      {children}
    </m.div>
  );
}
