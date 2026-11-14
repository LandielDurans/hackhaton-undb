"use client";
import { Suspense, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, Info, RotateCcw, SlidersHorizontal } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/queries";
import { useFiltrosUrl } from "@/lib/filtros";
import { COR_FAIXA, legendaCalor, type CamadaCalor } from "@/lib/calor";
import { STATUS_ROTULO, cn, dataBR, num, pct } from "@/lib/format";
import type { Mapa, Painel, Recomendacao, StatusPlano } from "@/lib/types";
import type { Camada, Metrica } from "@/components/map/rede-map";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingBlock, PageLoading, Skeleton } from "@/components/ui/states";
import { BarraPct } from "@/components/domain/kit";
import { TendenciaBadge, ValorIndicador } from "@/components/domain/badges";
import { RecomendacaoCard } from "@/components/domain/recomendacao";

const RedeMap = dynamic(() => import("@/components/map/rede-map"), { ssr: false, loading: () => <Skeleton className="h-[600px] w-full rounded-none" /> });

const CHAVES = ["territorioId", "escolaId", "ano", "componenteId", "habilidadeId", "avaliacaoId", "statusPlano", "camada", "metrica", "territorios"] as const;

const CAMADAS: { id: Camada; rot: string }[] = [
  { id: "desempenho", rot: "Desempenho" },
  { id: "dificuldades", rot: "Dificuldades" },
  { id: "evolucao", rot: "Evolução" },
  { id: "formacao", rot: "Formação" },
  { id: "intervencoes", rot: "Planos" },
  { id: "distribuicao", rot: "Escolas" },
];

export default function RedePage() {
  return <Suspense fallback={<PageLoading />}><Rede /></Suspense>;
}

function Rede() {
  const { usuario } = useAuth();
  const meta = useMeta();
  const [f, set] = useFiltrosUrl(CHAVES);
  const [maisFiltros, setMaisFiltros] = useState(!!(f.escolaId || f.habilidadeId || f.statusPlano || f.metrica));
  const camada = (f.camada || "desempenho") as Camada;
  const metrica = (f.metrica || "acerto") as Metrica;
  const filtroApi = { territorioId: f.territorioId, escolaId: f.escolaId, ano: f.ano, componenteId: f.componenteId, habilidadeId: f.habilidadeId, avaliacaoId: f.avaliacaoId, statusPlano: f.statusPlano };

  const mapa = useQuery({ queryKey: ["rede-mapa", filtroApi], queryFn: () => api.get<Mapa>("/api/rede/mapa" + qs(filtroApi)) });
  const painel = useQuery({ queryKey: ["rede-painel", filtroApi], queryFn: () => api.get<Painel>("/api/rede/painel" + qs(filtroApi)) });
  const recs = useQuery({
    queryKey: ["recomendacoes", "regionais", f.territorioId, f.componenteId, f.ano, f.avaliacaoId],
    queryFn: () => api.get<Recomendacao[]>("/api/recomendacoes/regionais" + qs({ territorioId: f.territorioId, componenteId: f.componenteId, ano: f.ano, avaliacaoId: f.avaliacaoId })),
  });

  const habilidades = useMemo(() => (meta.data?.habilidades ?? [])
    .filter(h => (!f.ano || h.anoEscolar === Number(f.ano)) && (!f.componenteId || h.componenteId === f.componenteId)), [meta.data, f.ano, f.componenteId]);
  const escolas = useMemo(() => (meta.data?.escolas ?? []).filter(e => !f.territorioId || e.territorioId === f.territorioId), [meta.data, f.territorioId]);

  if (meta.isLoading || !usuario) return <PageLoading />;
  if (meta.error) return <ErrorState error={meta.error} onRetry={() => meta.refetch()} />;
  const m = meta.data!;
  const crit = m.criterios;
  const temFiltro = ["territorioId", "escolaId", "ano", "componenteId", "habilidadeId", "avaliacaoId", "statusPlano"].some(k => f[k as keyof typeof f]);
  const ehCalor = ["desempenho", "dificuldades", "evolucao", "formacao"].includes(camada);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold leading-tight">Mapa da rede</h1>
          <p className="mt-1 text-[14.5px] text-ink-2">Onde estão os desafios. Clique numa escola para abrir.</p>
        </div>
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Componente">
          {[["", "Tudo"], ["MAT", "Matemática"], ["LP", "Português"]].map(([v, r]) => (
            <button key={v} onClick={() => set({ componenteId: v, habilidadeId: "" })} aria-pressed={f.componenteId === v}
              className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", f.componenteId === v ? "bg-azulejo-700 text-white" : "text-ink-2 hover:bg-canvas")}>{r}</button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filtro rot="Ano" value={f.ano} onChange={v => set({ ano: v, habilidadeId: "" })} opcoes={m.anos.map(a => [String(a), `${a}º ano`])} todos="Todos os anos" />
        <Filtro rot="Território" value={f.territorioId} onChange={v => set({ territorioId: v, escolaId: "" })} opcoes={m.territorios.map(t => [t.id, t.nome])} todos="Todos os territórios" />
        <Filtro rot="Avaliação" value={f.avaliacaoId} onChange={v => set({ avaliacaoId: v })} opcoes={m.avaliacoes.map(a => [a.id, `${a.sigla} · ${dataBR(a.data)}`])} todos="Avaliação mais recente" />
        <Button variant="ghost" size="sm" onClick={() => setMaisFiltros(!maisFiltros)} aria-expanded={maisFiltros}>
          <SlidersHorizontal size={14} />Mais filtros<ChevronDown size={14} className={cn("transition-transform", maisFiltros && "rotate-180")} />
        </Button>
        {temFiltro && <Button variant="ghost" size="sm" onClick={() => set({ territorioId: "", escolaId: "", ano: "", componenteId: "", habilidadeId: "", avaliacaoId: "", statusPlano: "" })}><RotateCcw size={14} />Limpar</Button>}
      </div>
      {maisFiltros && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Filtro rot="Escola" value={f.escolaId} onChange={v => set({ escolaId: v })} opcoes={escolas.map(e => [e.id, e.nome])} todos="Todas as escolas" />
          <Filtro rot="Habilidade" value={f.habilidadeId} onChange={v => set({ habilidadeId: v })} opcoes={habilidades.map(h => [h.id, `${h.grupo} · ${h.id}`])} todos="Todas as habilidades" />
          <Filtro rot="Planos" value={f.statusPlano} onChange={v => set({ statusPlano: v })} opcoes={(Object.keys(STATUS_ROTULO) as StatusPlano[]).map(s => [s, `Com plano ${STATUS_ROTULO[s].toLowerCase()}`])} todos="Com ou sem planos" />
          <Filtro rot="Indicador" value={metrica === "acerto" ? "" : metrica} onChange={v => set({ metrica: v })} opcoes={[["adequado", "% de estudantes adequados"]]} todos="% médio de acerto" />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden self-start">
          <div className="flex flex-wrap items-center gap-1 border-b border-line p-2" role="tablist" aria-label="O que mostrar no mapa">
            {CAMADAS.map(c => (
              <button key={c.id} role="tab" aria-selected={camada === c.id} onClick={() => set({ camada: c.id })}
                className={cn("rounded-lg px-3 py-1.5 text-[13px] font-medium", camada === c.id ? "bg-azulejo-700 text-white" : "text-ink-2 hover:bg-azulejo-50")}>{c.rot}</button>
            ))}
            <label className="ml-auto inline-flex items-center gap-1.5 px-2 text-[12.5px] text-ink-3 cursor-pointer">
              <input type="checkbox" checked={f.territorios === "1"} onChange={e => set({ territorios: e.target.checked ? "1" : "" })} className="accent-azulejo-700" />Nomes dos territórios
            </label>
          </div>
          <div className="relative">
            {mapa.data ? (
              <RedeMap escolas={mapa.data.escolas} territorios={mapa.data.territorios} camada={camada} metrica={metrica} criterios={crit}
                mostrarTerritorios={f.territorios === "1"} selecionada={f.escolaId || undefined} usuario={usuario} altura={600} />
            ) : mapa.error ? <div className="p-5"><ErrorState error={mapa.error} onRetry={() => mapa.refetch()} /></div> : <Skeleton className="h-[600px] w-full rounded-none" />}

            <div className="absolute bottom-3 left-3 z-[500] max-w-[260px] rounded-xl border border-line bg-white/95 px-3 py-2.5 shadow-[var(--shadow-pop)]">
              {ehCalor ? (
                <ul className="space-y-1 text-[12px] text-ink-2">
                  {legendaCalor(camada as CamadaCalor, crit, metrica).map(([fx, r]) => (
                    <li key={fx} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: COR_FAIXA[fx], boxShadow: `0 0 8px 2px ${COR_FAIXA[fx]}66` }} />{r}</li>
                  ))}
                </ul>
              ) : camada === "intervencoes" ? (
                <p className="text-[12px] text-ink-2">Número de planos por escola · <span className="inline-block h-2.5 w-2.5 rounded-full bg-azulejo-700 align-middle" /> com plano em andamento</p>
              ) : <p className="text-[12px] text-ink-2">Tamanho do ponto = número de matrículas</p>}
            </div>
            {mapa.isFetching && mapa.data && <div className="absolute right-3 top-3 z-[500] rounded-full bg-white/90 px-3 py-1 text-xs text-ink-2 shadow">Atualizando…</div>}
          </div>
          {mapa.data && (
            <details className="border-t border-line px-4 py-2.5 text-[12px] text-ink-3">
              <summary className="cursor-pointer inline-flex items-center gap-1.5"><Info size={13} />Sobre estes dados</summary>
              <p className="mt-1.5 leading-relaxed">{mapa.data.aviso} O foco de calor fica em volta de cada escola e representa apenas ela. Avaliação: {mapa.data.avaliacao.nome}.</p>
            </details>
          )}
        </Card>

        <PainelLateral painel={painel.data} loading={painel.isLoading} error={painel.error} crit={crit} />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-2">
          <h2 className="text-lg font-semibold">Sugestões para a rede</h2>
          <Link href="/rede/prioridades" className="text-sm font-medium text-azulejo-700 hover:underline inline-flex items-center gap-1">Ver todas<ArrowRight size={14} /></Link>
        </div>
        {recs.isLoading ? <LoadingBlock linhas={3} /> : recs.error ? <ErrorState error={recs.error} /> : recs.data!.length === 0 ? (
          <Card className="p-5 text-sm text-ink-3">Nenhum padrão preocupante com estes filtros.</Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3 items-start">
            {recs.data!.slice(0, 3).map(r => <RecomendacaoCard key={r.chave} r={r} podeAgir={usuario.papel === "GESTOR_REDE"} mostrarEstrategias={false} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Filtro({ rot, value, onChange, opcoes, todos }: { rot: string; value: string; onChange: (v: string) => void; opcoes: string[][]; todos: string }) {
  return (
    <Select aria-label={rot} value={value} onChange={e => onChange(e.target.value)} className={cn("h-9 w-auto min-w-[150px] text-[13px]", value && "border-azulejo-500 bg-azulejo-50 text-azulejo-900")}>
      <option value="">{todos}</option>
      {opcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
    </Select>
  );
}

function PainelLateral({ painel, loading, error, crit }: { painel?: Painel; loading: boolean; error: unknown; crit: { adequado: number; atencao: number } }) {
  if (loading) return <Card className="p-5"><LoadingBlock linhas={10} /></Card>;
  if (error || !painel) return <ErrorState error={error} />;
  const p = painel;
  const topForm = p.demandasFormacao.find(d => d.professoresSemFormacao > 0);
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-[12.5px] text-ink-3">Acerto médio · {p.avaliacao.sigla}</p>
        <div className="mt-1 flex items-end gap-3">
          <span className="text-[34px] font-bold font-display leading-none"><ValorIndicador ind={p.indicador} /></span>
          <TendenciaBadge tendencia={p.tendencia} variacao={p.variacao} />
        </div>
        <p className="mt-2 text-[12.5px] text-ink-3">{num(p.avaliados)} estudantes avaliados em {p.totalEscolas} escolas</p>
      </Card>

      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[14px] font-semibold">Onde agir primeiro</h2>
          <span className="text-[11px] text-ink-3">ordem alfabética</span>
        </div>
        <ul className="mt-2 divide-y divide-line">
          {p.escolasApoio.slice(0, 6).map(e => (
            <li key={e.id}>
              <Link href={`/rede?escolaId=${e.id}`} className="flex items-center justify-between gap-2 py-2 hover:text-azulejo-700">
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium truncate">{e.nome}</span>
                  <span className="block text-[11.5px] text-ink-3">{e.territorioNome}</span>
                </span>
                <span className="shrink-0 rounded-full bg-[#dc2626]/10 px-2 py-0.5 text-[11.5px] font-semibold text-[#b91c1c]">{e.habilidadesAtencao} críticas</span>
              </Link>
            </li>
          ))}
          {p.escolasApoio.length === 0 && <li className="py-2 text-sm text-ink-3">Nenhuma escola com sinal de alerta.</li>}
        </ul>
        {p.escolasApoio.length > 6 && <p className="mt-1 text-[12px] text-ink-3">+ {p.escolasApoio.length - 6} escolas</p>}
      </Card>

      <Card className="p-4">
        <h2 className="text-[14px] font-semibold mb-2.5">Habilidades mais difíceis</h2>
        <div className="space-y-3">
          {p.habilidades.slice(0, 3).map(h => (
            <div key={h.id}>
              <div className="flex justify-between text-[13px]"><span>{h.grupo} <span className="font-mono text-[11px] text-ink-3">{h.id}</span></span><strong className="tabular">{pct(h.indicador.percentualAcerto)}</strong></div>
              <BarraPct valor={h.indicador.percentualAcerto} criterios={crit} className="mt-1" />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 text-center">
        <Link href="/acompanhamento" className="rounded-[var(--radius-card)] border border-line bg-surface p-3 hover:border-azulejo-200">
          <p className="text-[22px] font-bold font-display tabular">{p.intervencoes.EM_ANDAMENTO}</p>
          <p className="text-[12px] text-ink-3">planos em andamento</p>
          {p.intervencoesAtrasadas > 0 && <p className="text-[11.5px] font-medium text-[#b91c1c] mt-0.5">{p.intervencoesAtrasadas} atrasados</p>}
        </Link>
        <Link href="/formacao" className="rounded-[var(--radius-card)] border border-line bg-surface p-3 hover:border-azulejo-200">
          <p className="text-[22px] font-bold font-display tabular">{topForm?.professoresSemFormacao ?? 0}</p>
          <p className="text-[12px] text-ink-3 leading-snug">professores aguardando formação{topForm ? ` em ${topForm.titulo.split(" ")[0].toLowerCase()}` : ""}</p>
        </Link>
      </div>
    </div>
  );
}
