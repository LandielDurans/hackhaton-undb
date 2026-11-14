import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, CircleDot, AlertCircle, Minus, EyeOff, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Indicador, Nivel, Prioridade, StatusPlano, Tendencia, EscopoPlano } from "@/lib/types";
import { ESCOPO_ROTULO, NIVEL_ROTULO, PRIORIDADE_ROTULO, STATUS_ROTULO, pp, pct, cn } from "@/lib/format";

export function NivelBadge({ nivel, className }: { nivel?: Nivel; className?: string }) {
  if (!nivel) return <Badge className={className}>Sem dado</Badge>;
  const tone = nivel === "ADEQUADO" ? "green" : nivel === "EM_DESENVOLVIMENTO" ? "amber" : "red";
  const Icon = nivel === "ADEQUADO" ? CheckCircle2 : nivel === "EM_DESENVOLVIMENTO" ? CircleDot : AlertCircle;
  return <Badge tone={tone} className={className}><Icon size={12} aria-hidden />{NIVEL_ROTULO[nivel]}</Badge>;
}

export function TendenciaBadge({ tendencia, variacao, compacta }: { tendencia?: Tendencia; variacao?: number | null; compacta?: boolean }) {
  if (!tendencia || tendencia === "SEM_COMPARACAO") return <span className="text-xs text-ink-3">sem comparação</span>;
  const cfg = {
    MELHORA: { Icon: ArrowUpRight, cls: "text-melhora", rot: "Melhora" },
    ESTAVEL: { Icon: ArrowRight, cls: "text-estavel", rot: "Estável" },
    QUEDA: { Icon: ArrowDownRight, cls: "text-queda", rot: "Queda" },
  }[tendencia];
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular", cfg.cls)} title={`${cfg.rot} em relação à avaliação comparável anterior`}>
      <cfg.Icon size={14} aria-hidden />
      {variacao !== undefined && variacao !== null ? pp(variacao) : cfg.rot}
      {!compacta && <span className="sr-only"> ({cfg.rot})</span>}
    </span>
  );
}

const statusTone: Record<StatusPlano, "neutral" | "blue" | "green" | "terracota"> = {
  PLANEJADO: "neutral", EM_ANDAMENTO: "blue", CONCLUIDO: "green", REAVALIADO: "terracota",
};
export function StatusBadge({ status }: { status: StatusPlano }) {
  return <Badge tone={statusTone[status]}>{STATUS_ROTULO[status]}</Badge>;
}

export function EscopoBadge({ escopo }: { escopo: EscopoPlano }) {
  return <Badge tone="outline">{ESCOPO_ROTULO[escopo]}</Badge>;
}

export function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  const tone = prioridade === "ALTA" ? "red" : prioridade === "MEDIA" ? "amber" : "neutral";
  return <Badge tone={tone}><Flag size={11} aria-hidden />{PRIORIDADE_ROTULO[prioridade]}</Badge>;
}

/** Valor percentual de um indicador, tratando supressão (grupos pequenos). */
export function ValorIndicador({ ind, metrica = "acerto", className }: { ind?: Indicador; metrica?: "acerto" | "adequado"; className?: string }) {
  if (!ind || (!ind.suprimido && ind.percentualAcerto === undefined)) return <span className={cn("text-ink-3", className)}>—</span>;
  if (ind.suprimido) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-ink-3 text-xs", className)} title="Grupo com poucos estudantes: valor suprimido para proteger a identidade">
        <EyeOff size={12} aria-hidden /> suprimido
      </span>
    );
  }
  return <span className={cn("tabular", className)}>{pct(metrica === "acerto" ? ind.percentualAcerto : ind.percentualAdequado)}</span>;
}

export function Dash() {
  return <Minus size={12} className="text-ink-3" aria-label="sem dado" />;
}
