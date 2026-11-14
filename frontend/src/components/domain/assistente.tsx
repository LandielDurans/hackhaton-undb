"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, ChevronDown, ClipboardPlus, LineChart, Wrench } from "lucide-react";
import type { EstrategiaSugerida, Recomendacao } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usarRecomendacaoNoPlano } from "./recomendacao";
import { cn } from "@/lib/format";

/**
 * Sugestão do assistente docente em formato direto: o que trabalhar, o que fazer (passos curtos)
 * e como saber se funcionou. Evidências e justificativas ficam em "Por que essa sugestão?".
 */
export function SugestaoDocente({ r, podeAgir, abertaInicial = false }: { r: Recomendacao; podeAgir: boolean; abertaInicial?: boolean }) {
  const [sel, setSel] = useState(0);
  const [aberta, setAberta] = useState(abertaInicial);
  const router = useRouter();
  const e: EstrategiaSugerida | undefined = r.estrategias[sel];
  const descartada = r.decisao?.decisao === "DESCARTADA";
  const cor = r.prioridade === "ALTA" ? "#dc2626" : r.prioridade === "MEDIA" ? "#d4a106" : "#2563eb";
  const ultima = r.evidencias.filter(x => x.rotulo.startsWith("AV")).slice(-1)[0];

  return (
    <Card className={cn("overflow-hidden border-l-4", descartada && "opacity-60")} style={{ borderLeftColor: cor }}>
      <button onClick={() => setAberta(!aberta)} aria-expanded={aberta} className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-canvas/60">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] leading-snug">{r.grupo} <span className="font-mono text-[11.5px] font-normal text-ink-3">{r.habilidades.join(", ")}</span></p>
          <p className="text-[13px] text-ink-2 mt-0.5">
            {r.tipo === "EM_DESENVOLVIMENTO" ? "Está avançando, mas ainda não chegou lá" : r.tipo === "DIFICULDADE_RECORRENTE" ? "Dificuldade nas duas últimas avaliações" : "Dificuldade na última avaliação"}
            {ultima && <> · <strong className="tabular">{ultima.valor}</strong> na {ultima.rotulo.split(" ")[0]}</>}
          </p>
        </div>
        {r.planoRelacionadoId && <Badge tone="blue">Já tem plano</Badge>}
        {descartada && <Badge>Descartada</Badge>}
        <ChevronDown size={18} className={cn("shrink-0 text-ink-3 transition-transform", aberta && "rotate-180")} aria-hidden />
      </button>

      {aberta && (
        <div className="border-t border-line px-4 py-4 space-y-4">
          {r.estrategias.length === 0 ? <p className="text-sm text-ink-3">Sem estratégia cadastrada para esta habilidade.</p> : (
            <>
              {r.estrategias.length > 1 && (
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Opções de estratégia">
                  {r.estrategias.map((x, i) => (
                    <button key={x.id} role="tab" aria-selected={sel === i} onClick={() => setSel(i)}
                      className={cn("rounded-full border px-3 py-1 text-[12.5px]", sel === i ? "border-azulejo-700 bg-azulejo-700 text-white" : "border-line text-ink-2 hover:bg-canvas")}>
                      Opção {i + 1}
                    </button>
                  ))}
                </div>
              )}
              {e && (
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-terracota-600">Experimente</p>
                  <p className="text-[15px] font-semibold mt-0.5">{e.titulo}</p>
                  <ol className="mt-2 space-y-1.5">
                    {e.passos.map((p, i) => (
                      <li key={i} className="flex gap-2.5 text-[13.5px] text-ink-2 leading-snug">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-azulejo-50 text-[11px] font-bold text-azulejo-700">{i + 1}</span>{p}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 text-[12.5px]">
                    {e.materiais && <p className="rounded-lg bg-canvas px-3 py-2"><Wrench size={12} className="inline mr-1 text-ink-3" /><strong>Material:</strong> {e.materiais}</p>}
                    <p className="rounded-lg bg-canvas px-3 py-2"><LineChart size={12} className="inline mr-1 text-ink-3" /><strong>Acompanhe:</strong> {e.comoAcompanhar.split(".")[0]}.</p>
                    <p className="rounded-lg bg-canvas px-3 py-2"><CalendarCheck size={12} className="inline mr-1 text-ink-3" /><strong>Reavalie:</strong> {e.quandoReavaliar}</p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {podeAgir && !descartada && e && (
              <Button onClick={() => usarRecomendacaoNoPlano(router, r, e)}><ClipboardPlus size={15} />Usar no meu plano</Button>
            )}
            {r.planoRelacionadoId && <Link href={`/planos/${r.planoRelacionadoId}`} className="text-[13px] text-azulejo-700 hover:underline">Abrir plano atual</Link>}
          </div>

          <details className="text-[12.5px] text-ink-3">
            <summary className="cursor-pointer">Por que essa sugestão?</summary>
            <div className="mt-2 space-y-2">
              <ul className="space-y-1">
                {r.evidencias.map((ev, i) => (
                  <li key={i} className="flex justify-between gap-3 border-b border-line/60 pb-1 last:border-0">
                    <span>{ev.rotulo}</span><span className="text-right text-ink-2"><strong className="tabular">{ev.valor}</strong>{ev.detalhe && <span className="block text-[11px] text-ink-3">{ev.detalhe}</span>}</span>
                  </li>
                ))}
              </ul>
              {r.observacao && <p className="text-azulejo-900">{r.observacao}</p>}
              <p>{e?.objetivo}</p>
              <p>Prioridade: {r.justificativaPrioridade}</p>
              <p className="italic">Resultado de uma avaliação, não um rótulo do estudante. A decisão é sua.</p>
            </div>
          </details>
        </div>
      )}
    </Card>
  );
}

/** Mostra as 3 sugestões mais prioritárias e esconde o restante atrás de um botão. */
export function ListaSugestoes({ recs, podeAgir }: { recs: Recomendacao[]; podeAgir: boolean }) {
  const [todas, setTodas] = useState(false);
  const visiveis = todas ? recs : recs.slice(0, 3);
  return (
    <div className="space-y-3">
      {visiveis.map((r, i) => <SugestaoDocente key={r.chave} r={r} podeAgir={podeAgir} abertaInicial={i === 0} />)}
      {recs.length > 3 && (
        <Button variant="secondary" className="w-full" onClick={() => setTodas(!todas)}>
          {todas ? "Mostrar só as principais" : `Mostrar mais ${recs.length - 3} ponto(s) a trabalhar`}
        </Button>
      )}
    </div>
  );
}
