import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl sm:rounded-2xl border-2 border-border/80 bg-background px-3.5 py-2.5 text-sm font-semibold shadow-2xs transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 hover:border-cyan-500/40 focus-visible:outline-none focus-visible:border-cyan-500 focus-visible:ring-4 focus-visible:ring-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
