import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl sm:rounded-2xl text-sm font-extrabold cursor-pointer transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation min-h-[44px]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-700 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-600 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:bg-destructive/95",
        outline:
          "border-2 border-border/80 bg-background shadow-2xs hover:border-cyan-500/40 hover:bg-cyan-50/40 text-foreground active:bg-cyan-100/50 dark:hover:bg-slate-800",
        secondary: "bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 border border-cyan-500/20 shadow-2xs hover:bg-cyan-500/20 active:bg-cyan-500/30",
        ghost: "hover:bg-cyan-50/60 dark:hover:bg-slate-800 hover:text-cyan-800 dark:hover:text-cyan-200 active:bg-cyan-100/60",
        link: "text-cyan-600 dark:text-cyan-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 sm:h-12 px-5 py-2.5 text-sm",
        sm: "h-9 sm:h-10 rounded-xl px-3.5 text-xs",
        lg: "h-12 sm:h-13 rounded-2xl px-8 text-base",
        icon: "h-11 w-11 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  isLoading?: boolean;
  loadingText?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      isLoading = false,
      loadingText,
      disabled,
      onClick,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const [isInternalLoading, setIsInternalLoading] = React.useState(false);
    const isExecutingRef = React.useRef(false);
    const activeLoading = Boolean(loading || isLoading || isInternalLoading);

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if (isExecutingRef.current || activeLoading || disabled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (onClick) {
          const result = onClick(e);
          if (result && typeof (result as any).then === "function") {
            isExecutingRef.current = true;
            setIsInternalLoading(true);
            (result as Promise<any>).finally(() => {
              isExecutingRef.current = false;
              setIsInternalLoading(false);
            });
          }
        }
      },
      [activeLoading, disabled, onClick],
    );

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          onClick={handleClick}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || activeLoading}
        onClick={handleClick}
        {...props}
      >
        {activeLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            {loadingText !== undefined ? loadingText : children}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
