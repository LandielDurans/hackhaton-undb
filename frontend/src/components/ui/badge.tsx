import { cn } from "@/lib/format";

type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "terracota" | "outline";
const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-2 border border-line",
  blue: "bg-azulejo-50 text-azulejo-700 border border-azulejo-100",
  green: "bg-adequado-bg text-adequado border border-adequado/20",
  amber: "bg-desenvolvimento-bg text-desenvolvimento-ink border border-desenvolvimento/25",
  red: "bg-atencao-bg text-atencao border border-atencao/20",
  terracota: "bg-terracota-50 text-terracota-600 border border-terracota-500/25",
  outline: "bg-transparent text-ink-2 border border-line-2",
};

export function Badge({ tone = "neutral", className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-5 whitespace-nowrap", tones[tone], className)} {...p} />;
}
