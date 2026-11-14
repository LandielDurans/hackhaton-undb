import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { PlanoResumo } from "@/lib/types";
import { DECISAO_ROTULO, dataBR, cn } from "@/lib/format";
import { EscopoBadge, StatusBadge } from "./badges";
import { SkillTag } from "./kit";
import { EmptyState } from "@/components/ui/states";

export function PlanoLinha({ p, compacta }: { p: PlanoResumo; compacta?: boolean }) {
  const alvo = p.estudante?.nome ?? p.turma?.nome ?? p.escola?.nome ?? p.territorio?.nome;
  return (
    <Link href={`/planos/${p.id}`} className="group flex items-start gap-3 px-4 py-3 hover:bg-canvas/70 border-b border-line last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <StatusBadge status={p.status} />
          <EscopoBadge escopo={p.escopo} />
          {p.atrasado && <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-atencao"><AlertTriangle size={12} />Prazo vencido</span>}
          {p.decisaoReavaliacao && <span className="text-[11.5px] text-ink-3">· {DECISAO_ROTULO[p.decisaoReavaliacao]}</span>}
        </div>
        <p className="font-medium text-[14px] text-ink group-hover:text-azulejo-700 leading-snug">{p.titulo}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          {alvo && <span>{alvo}{p.escola && p.escopo !== "ESCOLA" && p.escopo !== "TERRITORIO" ? ` · ${p.escola.nome}` : ""}</span>}
          <span>Resp.: {p.responsavel}</span>
          <span>Prazo {dataBR(p.prazo)}</span>
          {p.acoesTotal > 0 && <span>{p.acoesConcluidas}/{p.acoesTotal} ações</span>}
        </div>
        {!compacta && p.habilidades.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">{p.habilidades.map(h => <SkillTag key={h} id={h} />)}</div>
        )}
      </div>
      <ChevronRight size={16} className="mt-1 text-ink-3 group-hover:text-azulejo-700 shrink-0" aria-hidden />
    </Link>
  );
}

export function PlanoLista({ planos, vazio, compacta, className }: { planos: PlanoResumo[]; vazio?: string; compacta?: boolean; className?: string }) {
  if (!planos.length) return <EmptyState title={vazio ?? "Nenhum plano encontrado"} />;
  return <div className={cn(className)}>{planos.map(p => <PlanoLinha key={p.id} p={p} compacta={compacta} />)}</div>;
}
