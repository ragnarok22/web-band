import { render, type RenderResult } from "@testing-library/react";
import { domAnimation, LazyMotion } from "framer-motion";
import type { ReactElement, ReactNode } from "react";

function MotionTestRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

export function renderWithMotion(ui: ReactElement): RenderResult {
  return render(ui, { wrapper: MotionTestRoot });
}
