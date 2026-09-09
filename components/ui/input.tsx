import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-sm border border-line bg-paper px-2.5 text-sm text-ink shadow-none outline-none placeholder:text-muted focus-visible:border-navy focus-visible:ring-1 focus-visible:ring-navy disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
