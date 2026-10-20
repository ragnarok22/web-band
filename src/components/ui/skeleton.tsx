import { cn } from "cn";
import type { ComponentProps } from "react";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("skeleton bg-foreground/8 rounded-md", className)}
    />
  );
}
