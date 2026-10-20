import type { ReactNode } from "react";

interface LoadingSkeletonProps {
  as?: "main" | "div";
  children: ReactNode;
  className?: string;
  label: string;
}

export function LoadingSkeleton({
  as: Component = "main",
  children,
  className,
  label,
}: LoadingSkeletonProps) {
  return (
    <>
      {/* Keep the announcement outside the busy region so it is not deferred. */}
      <p aria-live="polite" className="sr-only" role="status">
        {label}
      </p>
      <Component
        aria-busy="true"
        aria-label={label}
        className={className}
        data-slot="loading-skeleton"
        role={Component === "div" ? "region" : undefined}
      >
        <div aria-hidden="true">{children}</div>
      </Component>
    </>
  );
}
