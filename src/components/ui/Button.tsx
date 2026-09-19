"use client";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const btn = cva(
  "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "glass-pill relative isolate text-black overflow-hidden [background_clip:border-box] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(255,255,255,0.18)]",
        iris:
          "relative isolate overflow-hidden bg-gradient-to-b from-[#8d71ff] to-[#6d4dff] text-white hover:brightness-110 shadow-[0_8px_28px_rgba(124,92,255,0.45)] hover:-translate-y-0.5 border border-white/25",
        ghost:
          "glass-chip text-(--tx1) hover:text-(--tx1) hover:-translate-y-0.5",
        subtle: "text-(--tx3) hover:text-(--tx1) hover:bg-[rgb(var(--tint)/0.07)]",
        danger:
          "bg-[#fb7185]/10 text-[#fb7185] border border-[#fb7185]/25 hover:bg-[#fb7185]/20 hover:-translate-y-0.5",
        outline:
          "border border-[rgb(var(--tint)/0.15)] text-(--tx1) hover:bg-[rgb(var(--tint)/0.06)] glass-chip",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px]",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-7 text-[15px]",
        icon: "h-10 w-10",
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof btn> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...p }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(btn({ variant, size }), className)}
      {...p}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
