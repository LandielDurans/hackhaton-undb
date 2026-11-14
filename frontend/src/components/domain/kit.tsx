import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import { cn, pct, NIVEL_COR, nivelDe } from "@/lib/format";
import type { Indicador } from "@/lib/types";

export function PageHeader({ eyebrow, title, description, actions, breadcrumb }: {
  eyebrow?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode;
  breadcrumb?: { href?: string; label: string }[];
}) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <nav aria-label="Navegação estrutural" className="mb-2 flex flex-wrap items-center gap-1 text-[13px] text-ink-3">
          {breadcrumb.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight size={13} aria-hidden />}
              {b.href ? <Link href={b.href} className="hover:text-azulejo-700 hover:underline">{b.label}</Link> : <span className="text-ink-2">{b.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-terracota-600">{eyebrow}</div>}
          <h1 className="text-2xl md:text-[28px] font-bold text-ink leading-tight">{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-[14.5px] text-ink-2 leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export function Kpi({ label, value, sub, icon, tone, className }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; tone?: "default" | "atencao"; className?: string;
}) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-ink-3">{label}</span>
        {icon && <span className={cn("text-ink-3", tone === "atencao" && "text-atencao")}>{icon}</span>}
      </div>
      <div className="mt-1.5 text-[26px] font-bold font-display leading-none text-ink tabular">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-ink-3 leading-snug">{sub}</div>}
    </div>
  );
}

/** Barra de percentual com marcas dos limiares pedagógicos. */
export function BarraPct({ valor, criterios, className, altura = 8 }: {
  valor?: number; criterios: { adequado: number; atencao: number }; className?: string; altura?: number;
}) {
  const nivel = nivelDe(valor, criterios);
  return (
    <div className={cn("relative w-full rounded-full bg-canvas border border-line", className)} style={{ height: altura }} aria-hidden>
      {valor !== undefined && (
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(2, Math.min(100, valor))}%`, background: nivel ? NIVEL_COR[nivel] : "var(--color-ink-3)" }} />
      )}
      <span className="absolute -inset-y-0.5 w-px bg-ink-3/50" style={{ left: `${criterios.atencao}%` }} />
      <span className="absolute -inset-y-0.5 w-px bg-ink-3/50" style={{ left: `${criterios.adequado}%` }} />
    </div>
  );
}

/** Distribuição de estudantes por faixa (barra empilhada horizontal, com rótulos). */
export function DistribuicaoNiveis({ ind, compacta }: { ind?: Indicador; compacta?: boolean }) {
  if (!ind || ind.suprimido || !ind.estudantes || ind.adequados === undefined) {
    return <p className="text-xs text-ink-3">{ind?.suprimido ? "Distribuição suprimida (grupo pequeno)" : "Sem dados"}</p>;
  }
  const total = (ind.adequados ?? 0) + (ind.emDesenvolvimento ?? 0) + (ind.requerAtencao ?? 0);
  const partes = [
    { k: "Adequado", n: ind.adequados ?? 0, cor: "var(--color-adequado)" },
    { k: "Em desenvolvimento", n: ind.emDesenvolvimento ?? 0, cor: "var(--color-desenvolvimento)" },
    { k: "Requer atenção", n: ind.requerAtencao ?? 0, cor: "var(--color-atencao)" },
  ];
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img"
        aria-label={partes.map(p => `${p.k}: ${p.n} estudantes`).join(", ")}>
        {partes.filter(p => p.n > 0).map(p => (
          <div key={p.k} style={{ width: `${(100 * p.n) / total}%`, background: p.cor }} title={`${p.k}: ${p.n} (${pct((100 * p.n) / total)})`} />
        ))}
      </div>
      {!compacta && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          {partes.map(p => (
            <span key={p.k} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: p.cor }} aria-hidden />
              {p.k} <strong className="tabular font-semibold">{p.n}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Nota({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-xs text-ink-3 leading-relaxed", className)}>
      <Info size={13} className="shrink-0 mt-0.5" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function SecaoTitulo({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function SkillTag({ id, grupo, className }: { id: string; grupo?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md bg-azulejo-50 px-1.5 py-0.5 text-[11.5px] font-medium text-azulejo-700 border border-azulejo-100", className)}
      title={grupo ? `${id} — ${grupo}` : id}>
      <span className="font-mono">{id}</span>{grupo && <span className="text-ink-3 font-normal">· {grupo}</span>}
    </span>
  );
}
