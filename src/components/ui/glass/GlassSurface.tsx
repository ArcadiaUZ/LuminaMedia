import { cn } from "@/lib/utils";

/**
 * Reusable translucent material primitive.
 *
 * - `regular` — stronger blur + tint, for navigation, controls, text-heavy panels
 * - `clear`   — more transparent, lets rich media show through underneath
 *
 * Add `interactive` to enable the pointer-tracked specular sheen, and
 * `sheen` only where a moving highlight adds purpose (hero surfaces, search).
 */
export function GlassSurface({
  variant = "regular",
  interactive = false,
  sheen = false,
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  variant?: "regular" | "clear";
  interactive?: boolean;
  sheen?: boolean;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        variant === "clear" ? "glass clear-glass" : "glass",
        interactive && "transition-transform duration-300 hover:-translate-y-0.5",
        sheen && "glass-sheen glass-pointer",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}