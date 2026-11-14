"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/queries";
import { useFiltrosUrl } from "@/lib/filtros";
import { NIVEL_COR, nivelDe, pct } from "@/lib/format";
import type { Comparativo, Recomendacao } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { ErrorState, LoadingBlock, PageLoading } from "@/components/ui/states";
import { Nota, PageHeader } from "@/components/domain/kit";
import { TendenciaBadge, ValorIndicador } from "@/components/domain/badges";
import { RecomendacaoCard } from "@/components/domain/recomendacao";

export default function Page() {
  return <Suspense fallback={<PageLoading />}><Prioridades /></Suspense>;
}

function Prioridades() {
  const { usuario } = useAuth();
  const meta = useMeta();
  const [f, set] = useFiltrosUrl(["ano", "componenteId", "prioridade"] as const);
  const ano = f.ano || "5";
  const comp = f.componenteId || "MAT";
  const comp_ = useQuery({ queryKey: ["territorios", ano, comp], queryFn: () => api.get<Comparativo>("/api/rede/territorios" + qs({ ano, componenteId: comp })) });
  const recs = useQuery({ queryKey: ["recomendacoes", "regionais", "prior", ano, comp], queryFn: () => api.get<Recomendacao[]>("/api/recomendacoes/regionais" + qs({ ano, componenteId: comp })) });
  if (meta.isLoading) return <PageLoading />;
  const crit = meta.data!.criterios;
  const lista = (recs.data ?? []).filter(r => !f.prioridade || r.prioridade === f.prioridade);

  return (
    <div>
      <PageHeader eyebrow="Nível 1 · Indicadores e prioridades" title="Onde atuar, em quais habilidades e com quais estratégias iniciais"
        description="Comparação entre territórios por habilidade (agregados, sem ranking de escolas) e recomendações priorizadas por regras explícitas." />
      <div className="mb-5 flex flex-wrap gap-2">
        <Select className="h-9 w-auto text-[13px]" value={ano} onChange={e => set({ ano: e.target.value })} aria-label="Ano escolar">
          {meta.data!.anos.map(a => <option key={a} value={a}>{a}º ano</option>)}
        </Select>
        <Select className="h-9 w-auto text-[13px]" value={comp} onChange={e => set({ componenteId: e.target.value })} aria-label="Componente">
          {meta.data!.componentes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
      </div>

      <Card className="mb-6">
        <CardHeader title="Território × habilidade" subtitle={comp_.data ? `Percentual de acerto na ${comp_.data.avaliacao.sigla}. Cores pelas faixas pedagógicas; o valor está sempre escrito.` : ""} />
        {comp_.isLoading ? <CardBody><LoadingBlock /></CardBody> : comp_.error ? <CardBody><ErrorState error={comp_.error} /></CardBody> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-y border-line bg-canvas/70 text-[11.5px] text-ink-3">
                  <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-wide">Território</th>
                  <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide">Geral</th>
                  <th className="px-3 py-2.5 font-semibold uppercase tracking-wide">Evolução</th>
                  {comp_.data!.habilidades.map(h => <th key={h.id} className="px-2 py-2.5 text-center font-mono font-semibold" title={h.descricao}>{h.id}<span className="block font-sans font-normal normal-case">{h.grupo}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {comp_.data!.territorios.map(t => (
                  <tr key={t.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5"><Link href={`/rede?territorioId=${t.id}&ano=${ano}&componenteId=${comp}`} className="font-medium hover:text-azulejo-700 hover:underline">{t.nome}</Link><span className="block text-[11.5px] text-ink-3">{t.escolas} escolas · {t.bairros}</span></td>
                    <td className="px-3 py-2.5 text-right font-semibold"><ValorIndicador ind={t.indicador} /></td>
                    <td className="px-3 py-2.5">
                      {(() => { const s = t.serie; const a = s[s.length - 1], b = s[s.length - 2]; return <TendenciaBadge tendencia={!a?.variacao && a?.variacao !== 0 ? "SEM_COMPARACAO" : a.variacao! >= crit.variacaoRelevante ? "MELHORA" : a.variacao! <= -crit.variacaoRelevante ? "QUEDA" : "ESTAVEL"} variacao={a?.variacao} />; void b; })()}
                      <span className="block text-[11px] text-ink-3">{t.serie.map(s => `${s.sigla} ${pct(s.indicador.percentualAcerto)}`).join(" · ")}</span>
                    </td>
                    {comp_.data!.habilidades.map(h => {
                      const cel = comp_.data!.matriz.find(m => m.territorioId === t.id && m.habilidadeId === h.id)!;
                      const v = cel.indicador.suprimido ? undefined : cel.indicador.percentualAcerto;
                      const n = nivelDe(v, crit);
                      return <td key={h.id} className="px-1.5 py-1.5 text-center">
                        <span className="block rounded-md py-2 font-semibold tabular" style={n ? { background: `color-mix(in srgb, ${NIVEL_COR[n]} ${n === "REQUER_ATENCAO" ? 22 : 12}%, white)` } : undefined}
                          title={`${t.nome} · ${h.id}: ${pct(v)} (${cel.indicador.estudantes} estudantes)`}>{cel.indicador.suprimido ? "supr." : pct(v)}</span>
                      </td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-line"><Nota>Territórios são agrupamentos demonstrativos de bairros. A tabela compara agregados para orientar apoio; não classifica escolas.</Nota></div>
      </Card>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold">Recomendações priorizadas ({lista.length})</h2>
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-[13px]">
          {[["", "Todas"], ["ALTA", "Alta"], ["MEDIA", "Média"], ["BAIXA", "Baixa"]].map(([v, r]) => (
            <button key={v} onClick={() => set({ prioridade: v })} aria-pressed={f.prioridade === v} className={`rounded-md px-3 py-1.5 ${f.prioridade === v ? "bg-azulejo-700 text-white" : "text-ink-2"}`}>{r}</button>
          ))}
        </div>
      </div>
      {recs.isLoading ? <LoadingBlock /> : recs.error ? <ErrorState error={recs.error} /> : lista.length === 0 ? <Card className="p-6 text-sm text-ink-3">Nenhuma recomendação para o recorte.</Card>
        : <div className="grid gap-3 lg:grid-cols-2 items-start">{lista.map((r, i) => <RecomendacaoCard key={r.chave} r={r} defaultOpen={i === 0} podeAgir={usuario?.papel === "GESTOR_REDE"} mostrarEstrategias={false} />)}</div>}
    </div>
  );
}
