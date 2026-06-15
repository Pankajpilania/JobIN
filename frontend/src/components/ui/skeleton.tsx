import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/40 relative overflow-hidden",
        "before:absolute before:inset-0 before:bg-shimmer before:bg-[length:200%_100%] before:animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
