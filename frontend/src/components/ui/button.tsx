import { forwardRef } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-azulejo-700 text-white hover:bg-azulejo-600 disabled:bg-azulejo-200",
  accent: "bg-terracota-600 text-white hover:bg-terracota-500 disabled:opacity-50",
  secondary: "bg-surface text-ink border border-line-2 hover:bg-azulejo-50 hover:border-azulejo-200 disabled:opacity-50",
  ghost: "text-ink-2 hover:bg-azulejo-50 hover:text-azulejo-700 disabled:opacity-50",
  danger: "bg-surface text-atencao border border-atencao/40 hover:bg-atencao-bg disabled:opacity-50",
};
const sizes: Record<Size, string> = { sm: "h-8 px-3 text-[13px] gap-1.5", md: "h-10 px-4 text-sm gap-2" };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("inline-flex items-center justify-center rounded-lg font-medium transition-colors whitespace-nowrap disabled:cursor-not-allowed",
        variants[variant], sizes[size], className)}
      {...props}
    />
  );
});

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn("inline-flex items-center justify-center rounded-lg font-medium transition-colors whitespace-nowrap", variants[variant], sizes[size], extra);
}
