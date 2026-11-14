import { cloneElement, forwardRef, isValidElement, useId } from "react";
import { cn } from "@/lib/format";

const base = "w-full rounded-lg border border-line-2 bg-surface px-3 text-sm text-ink placeholder:text-ink-3 focus:border-azulejo-500 focus:outline-none focus:ring-2 focus:ring-azulejo-100 disabled:bg-canvas disabled:text-ink-3";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(base, "h-10", className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(base, "py-2 min-h-[84px] leading-relaxed", className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cn(base, "h-10 pr-8 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[right_10px_center] bg-no-repeat", className)} {...p} />;
});

export function Field({ label, hint, required, children, className, htmlFor }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string; htmlFor?: string;
}) {
  const auto = useId();
  // Associa o rótulo ao controle (acessibilidade): usa o id do filho ou gera um.
  let id = htmlFor;
  let controle = children;
  if (!id && isValidElement<{ id?: string; "aria-describedby"?: string }>(children)) {
    id = children.props.id ?? auto;
    controle = cloneElement(children, { id, "aria-describedby": hint ? `${id}-dica` : undefined });
  }
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-ink-2">
        {label} {required && <span className="text-atencao" aria-hidden>*</span>}
      </label>
      {controle}
      {hint && <p id={id ? `${id}-dica` : undefined} className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}
