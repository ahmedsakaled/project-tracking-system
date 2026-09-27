import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-xl border px-3 py-0.5 text-xs font-black transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-2xs",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-xs",
        secondary:
          "border-cyan-500/20 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",
        outline: "border-border/80 text-foreground bg-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
