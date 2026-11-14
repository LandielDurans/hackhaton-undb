"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarClock, CheckCircle2, ChevronDown, ClipboardPlus, GraduationCap, ListChecks, Users, XCircle, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { PrioridadeBadge } from "./badges";
import { api } from "@/lib/api";
import { FORMACAO_STATUS, cn } from "@/lib/format";
import type { EstrategiaSugerida, Recomendacao } from "@/lib/types";

export const REC_STORAGE = "conecta:recomendacao";

/** Guarda a recomendação escolhida (e opcionalmente a estratégia) para pré-preencher o plano. */
export function usarRecomendacaoNoPlano(router: ReturnType<typeof useRouter>, r: Recomendacao, estrategia?: EstrategiaSugerida) {
  try { sessionStorage.setItem(REC_STORAGE, JSON.stringify({ r, estrategiaId: estrategia?.id })); } catch { /* sem storage: formulário abre vazio */ }
  router.push("/planos/novo?origem=recomendacao");
}

export function RecomendacaoCard({ r, podeAgir = true, defaultOpen = false, mostrarEstrategias = true }: {
  r: Recomendacao; podeAgir?: boolean; defaultOpen?: boolean; mostrarEstrategias?: boolean;
}) {
  const [aberta, setAberta] = useState(defaultOpen);
  const [descartar, setDescartar] = useState(false);
  const router = useRouter();
  const descartada = r.decisao?.decisao === "DESCARTADA";
  const aceita = r.decisao?.decisao === "ACEITA";

  return (
    <Card className={cn("overflow-hidden", descartada && "opacity-70")}>
      <button className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-canvas/60" onClick={() => setAberta(!aberta)} aria-expanded={aberta}>
        <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", r.prioridade === "ALTA" ? "bg-[#d9573f]" : r.prioridade === "MEDIA" ? "bg-[#e0aa12]" : "bg-[#a3a8b0]")} aria-hidden />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[14.5px] text-ink leading-snug">{r.titulo}</h3>
          <p className="text-[13px] text-ink-2 mt-1 leading-relaxed line-clamp-2">{r.acaoSugerida}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <PrioridadeBadge prioridade={r.prioridade} />
            {descartada && <Badge tone="neutral"><XCircle size={11} />Descartada</Badge>}
            {aceita && <Badge tone="green"><CheckCircle2 size={11} />Virou plano</Badge>}
            {r.planoRelacionadoId && !aceita && <Badge tone="blue">Já tem plano</Badge>}
          </div>
        </div>
        <ChevronDown size={18} className={cn("mt-1 shrink-0 text-ink-3 transition-transform", aberta && "rotate-180")} aria-hidden />
      </button>

      {aberta && (
        <div className="border-t border-line px-4 py-4 space-y-4 bg-canvas/40">
          <p className="text-[13.5px] text-ink-2 leading-relaxed">{r.explicacao}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-2 flex items-center gap-1.5"><Eye size={13} />Evidências observadas</h4>
              <ul className="space-y-1.5">
                {r.evidencias.map((e, i) => (
                  <li key={i} className="text-[13px] flex flex-wrap justify-between gap-x-3 border-b border-line/70 pb-1.5 last:border-0">
                    <span className="text-ink-2">{e.rotulo}</span>
                    <span className="text-right"><strong className="font-semibold text-ink tabular">{e.valor}</strong>
                      {e.detalhe && <span className="block text-[11.5px] text-ink-3">{e.detalhe}</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3 text-[13px]">
              <Info icon={<CalendarClock size={13} />} rot="Contexto temporal">{r.contextoTemporal}</Info>
              <Info icon={<Users size={13} />} rot="Público responsável">{r.publicoResponsavel}</Info>
              <details className="text-[12.5px] text-ink-3"><summary className="cursor-pointer flex items-center gap-1.5"><ListChecks size={13} />Por que esta prioridade?</summary><p className="mt-1">{r.justificativaPrioridade}</p></details>
            </div>
          </div>

          {r.observacao && <p className="rounded-lg bg-azulejo-50 border border-azulejo-100 px-3 py-2 text-[13px] text-azulejo-900">{r.observacao}</p>}

          {mostrarEstrategias && r.estrategias.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-3 mb-2 flex items-center gap-1.5"><BookOpen size={13} />Estratégias do catálogo</h4>
              <div className="grid gap-2 md:grid-cols-2">
                {r.estrategias.map(e => (
                  <div key={e.id} className="rounded-lg border border-line bg-surface p-3">
                    <p className="font-medium text-[13.5px]">{e.titulo}</p>
                    <p className="text-[12.5px] text-ink-3 mt-0.5">{e.objetivo}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {r.formacoes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <GraduationCap size={14} className="text-ink-3" aria-hidden />
              <span className="text-ink-3">Formação relacionada:</span>
              {r.formacoes.slice(0, 2).map(f => (
                <Link key={f.id} href="/formacao" className="text-azulejo-700 hover:underline">{f.titulo} <span className="text-ink-3">({FORMACAO_STATUS[f.status] ?? f.status})</span></Link>
              ))}
            </div>
          )}

          {r.decisao && (
            <p className="text-xs text-ink-3">
              {descartada ? "Descartada" : "Aceita"} por {r.decisao.usuario}{r.decisao.justificativa ? ` — “${r.decisao.justificativa}”` : ""}
              {r.decisao.planoId && <> · <Link className="text-azulejo-700 hover:underline" href={`/planos/${r.decisao.planoId}`}>ver plano</Link></>}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {podeAgir && !descartada && (
              <Button size="sm" onClick={() => usarRecomendacaoNoPlano(router, r)}><ClipboardPlus size={15} />Criar plano</Button>
            )}
            {r.planoRelacionadoId && (
              <Link href={`/planos/${r.planoRelacionadoId}`} className="text-[13px] text-azulejo-700 hover:underline">Ver plano ativo: {r.planoRelacionadoTitulo}</Link>
            )}
            {podeAgir && !r.decisao && <Button size="sm" variant="ghost" onClick={() => setDescartar(true)}>Descartar</Button>}
          </div>
          <p className="text-[11px] text-ink-3">Sugestão automática baseada em regras. A decisão é sua.</p>
        </div>
      )}
      <DescartarDialog open={descartar} onOpenChange={setDescartar} chave={r.chave} />
    </Card>
  );
}

function Info({ icon, rot, children }: { icon: React.ReactNode; rot: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3 flex items-center gap-1.5">{icon}{rot}</p>
      <p className="text-ink-2 mt-0.5 leading-relaxed">{children}</p>
    </div>
  );
}

function DescartarDialog({ open, onOpenChange, chave }: { open: boolean; onOpenChange: (o: boolean) => void; chave: string }) {
  const [just, setJust] = useState("");
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => api.post("/api/recomendacoes/decisoes", { chave, decisao: "DESCARTADA", justificativa: just }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recomendacoes"] }); onOpenChange(false); setJust(""); },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Descartar recomendação"
      description="A decisão profissional prevalece. Registre o motivo para que a equipe entenda a escolha.">
      <Field label="Justificativa" required>
        <Textarea value={just} onChange={e => setJust(e.target.value)} placeholder="Ex.: a dificuldade já é acompanhada em outro projeto da escola." maxLength={1000} />
      </Field>
      {m.error && <p className="text-sm text-atencao mt-2">{(m.error as Error).message}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button disabled={just.trim().length < 5 || m.isPending} onClick={() => m.mutate()}>Registrar descarte</Button>
      </div>
    </Dialog>
  );
}
