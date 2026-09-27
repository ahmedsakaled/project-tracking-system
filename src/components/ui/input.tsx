import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 sm:h-12 min-h-[44px] w-full rounded-xl sm:rounded-2xl border-2 border-border/80 bg-background px-3.5 py-2 text-sm font-semibold shadow-2xs transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-cyan-500/40 focus-visible:outline-none focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
