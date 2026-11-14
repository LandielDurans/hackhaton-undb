"use client";
import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, History, Lock, MapPin, Plus, Puzzle, School, Users } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/queries";
import { useFiltrosUrl } from "@/lib/filtros";
import { COMPONENTE_ROTULO, STATUS_ROTULO, cn, dataBR, dataHoraBR, num, pct } from "@/lib/format";
import type { DiagnosticoEscola, Recomendacao, StatusPlano } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/button";
import { ErrorState, LoadingBlock, PageLoading, Skeleton } from "@/components/ui/states";
import { BarraPct, Kpi, Nota, PageHeader, SkillTag } from "@/components/domain/kit";
import { TendenciaBadge, ValorIndicador } from "@/components/domain/badges";
import { RecomendacaoCard } from "@/components/domain/recomendacao";
import { PlanoLista } from "@/components/domain/planos";
import { EvolucaoChart } from "@/components/charts/evolucao";
import { descreverEvento } from "@/lib/eventos";

const MiniMapa = dynamic(() => import("@/components/map/mini-mapa"), { ssr: false, loading: () => <Skeleton className="h-[180px]" /> });

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense fallback={<PageLoading />}><EscolaPage id={id} /></Suspense>;
}

function EscolaPage({ id }: { id: string }) {
  const { usuario } = useAuth();
  const meta = useMeta();
  const [f, set] = useFiltrosUrl(["componenteId", "avaliacaoId"] as const);
  const q = useQuery({
    queryKey: ["escola", id, f.componenteId, f.avaliacaoId],
    queryFn: () => api.get<DiagnosticoEscola>(`/api/escolas/${id}` + qs({ componenteId: f.componenteId, avaliacaoId: f.avaliacaoId })),
  });
  const recs = useQuery({
    queryKey: ["recomendacoes", "escola", id, f.componenteId, f.avaliacaoId],
    queryFn: () => api.get<Recomendacao[]>(`/api/recomendacoes/escolas/${id}` + qs({ componenteId: f.componenteId, avaliacaoId: f.avaliacaoId })),
  });

  if (q.isLoading || meta.isLoading) return <PageLoading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  const crit = meta.data!.criterios;
  const podePlanoEscolar = usuario?.papel === "GESTOR_REDE" || (usuario?.papel === "COORDENADOR" && usuario.escolaId === id);
  const habsOrdenadas = [...d.habilidades].filter(h => !h.indicador.suprimido).sort((a, b) => (a.indicador.percentualAcerto ?? 0) - (b.indicador.percentualAcerto ?? 0));
  const comps = f.componenteId ? d.componentes.filter(c => c.componenteId === f.componenteId) : d.componentes;

  return (
    <div>
      <PageHeader
        breadcrumb={[{ href: "/rede", label: "Rede" }, { href: `/rede?territorioId=${d.escola.territorioId}`, label: d.territorioNome }, { label: d.escola.nome }]}
        title={<span className="inline-flex flex-wrap items-center gap-2">{d.escola.nome} <Badge tone="terracota">escola fictícia</Badge></span>}
        description={<span className="text-ink-3 text-[13.5px]">{d.escola.bairro} · {d.territorioNome} · {d.escola.etapas}</span>}
        actions={<>
          <Link href={`/rede?escolaId=${id}&territorioId=${d.escola.territorioId}`} className={buttonClass("secondary")}><MapPin size={15} />Ver no mapa</Link>
          {podePlanoEscolar && <Link href={`/planos/novo?escopo=ESCOLA&escolaId=${id}`} className={buttonClass("primary")}><Plus size={15} />Novo plano escolar</Link>}
        </>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Componente curricular">
          {[["", "Todos"], ["MAT", "Matemática"], ["LP", "Língua Portuguesa"]].map(([v, r]) => (
            <button key={v} onClick={() => set({ componenteId: v })} aria-pressed={f.componenteId === v}
              className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", f.componenteId === v ? "bg-azulejo-700 text-white" : "text-ink-2 hover:bg-canvas")}>{r}</button>
          ))}
        </div>
        <Select value={f.avaliacaoId} onChange={e => set({ avaliacaoId: e.target.value })} className="h-9 w-auto text-[13px]" aria-label="Avaliação">
          <option value="">Avaliação mais recente</option>
          {meta.data!.avaliacoes.map(a => <option key={a.id} value={a.id}>{a.sigla} · {a.nome}</option>)}
        </Select>
        <span className="text-xs text-ink-3">Referência: {d.avaliacao.nome} ({dataBR(d.avaliacao.data)}){d.avaliacaoAnterior ? ` · comparada com ${d.avaliacaoAnterior.sigla}` : ""}</span>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Turmas" value={num(d.totalTurmas)} sub={`${num(d.matriculados)} estudantes matriculados`} icon={<School size={16} />} />
        <Kpi label="Avaliados" value={num(d.avaliados)} sub={`cobertura ${pct(d.cobertura)}`} icon={<Users size={16} />} />
        {d.componentes.map(c => (
          <Kpi key={c.componenteId} label={`${c.nome} · % de acerto`} value={<ValorIndicador ind={c.indicador} />}
            sub={<span className="inline-flex items-center gap-1">{pct(c.indicador.percentualAdequado)} adequados · <TendenciaBadge tendencia={c.tendencia} variacao={c.variacao} /></span>} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Evolução das avaliações" subtitle="Percentual de acerto nas avaliações comparáveis da rede" />
          <CardBody>
            <EvolucaoChart criterios={crit} series={comps.map(c => ({ nome: c.nome, pontos: c.serie.map(s => ({ sigla: s.sigla, valor: s.indicador.suprimido ? null : s.indicador.percentualAcerto })) }))} />
          </CardBody>
        </Card>
        <Card className="overflow-hidden">
          <MiniMapa lat={d.escola.lat} lng={d.escola.lng} nome={d.escola.nome} />
          <div className="p-4 text-[13px] space-y-1">
            <p><span className="text-ink-3">Território:</span> {d.territorioNome}</p>
            <p><span className="text-ink-3">Bairro:</span> {d.escola.bairro}</p>
            <p><span className="text-ink-3">Componentes analisados:</span> Matemática e Língua Portuguesa</p>
            <Nota>Localização demonstrativa, não corresponde a uma escola real.</Nota>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Turmas" icon={<Users size={16} />} />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-y border-line bg-canvas/70 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
                <th className="px-5 py-2.5 font-semibold">Turma</th>
                {d.mostraProfessores && <th className="px-3 py-2.5 font-semibold">Professor(a)</th>}
                <th className="px-3 py-2.5 font-semibold text-right">Avaliados</th>
                <th className="px-3 py-2.5 font-semibold text-right">Matemática</th>
                <th className="px-3 py-2.5 font-semibold text-right">Língua Port.</th>
                <th className="px-3 py-2.5 font-semibold text-right">Habilidades críticas</th>
                <th className="px-3 py-2.5 font-semibold text-right">Planos ativos</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {d.turmas.map(t => (
                <tr key={t.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                  <td className="px-5 py-3 font-medium">{t.nome}<span className="block text-xs text-ink-3 font-normal">{t.turno}</span></td>
                  {d.mostraProfessores && <td className="px-3 py-3 text-ink-2">{t.professores.join(", ")}</td>}
                  <td className="px-3 py-3 text-right tabular">{t.avaliados}/{t.matriculados}</td>
                  {["MAT", "LP"].map(c => (
                    <td key={c} className="px-3 py-3 text-right">
                      <ValorIndicador ind={t.indicadores[c]} className="font-semibold" />
                      {t.variacoes[c] !== undefined && t.variacoes[c] !== null && <span className="block"><TendenciaBadge tendencia={(t.variacoes[c]! >= crit.variacaoRelevante ? "MELHORA" : t.variacoes[c]! <= -crit.variacaoRelevante ? "QUEDA" : "ESTAVEL")} variacao={t.variacoes[c]} compacta /></span>}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right tabular">{t.habilidadesAtencao > 0 ? <span className="font-semibold text-atencao">{t.habilidadesAtencao}</span> : "0"}</td>
                  <td className="px-3 py-3 text-right tabular">{t.planosAtivos}</td>
                  <td className="px-5 py-3 text-right">
                    {t.acessoTurma
                      ? <Link href={`/turmas/${t.id}`} className="inline-flex items-center gap-1 text-azulejo-700 font-medium hover:underline">Analisar<ArrowRight size={14} /></Link>
                      : <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Lock size={12} />restrito</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 mt-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Habilidades com resultados mais baixos" subtitle={`Ordenadas pelo percentual de acerto na ${d.avaliacao.sigla}`} icon={<Puzzle size={16} />}
            action={<Link href="/curriculo" className="text-[12.5px] text-azulejo-700 hover:underline">Matriz curricular</Link>} />
          <CardBody className="space-y-3">
            {habsOrdenadas.slice(0, 8).map(h => (
              <div key={h.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><SkillTag id={h.id} grupo={h.grupo} /><span className="text-xs text-ink-3">{h.anoEscolar}º ano</span></span>
                  <span className="text-[13px] font-semibold tabular"><ValorIndicador ind={h.indicador} /></span>
                </div>
                <BarraPct valor={h.indicador.percentualAcerto} criterios={crit} className="mt-1.5" />
                <p className="mt-1 text-[11.5px] text-ink-3">
                  {h.turmasEmAtencao} de {h.turmasComDados} turma(s) abaixo do limiar · <TendenciaBadge tendencia={h.tendencia} variacao={h.variacao} compacta />
                  {h.planosAtivos > 0 && <> · <span className="text-azulejo-700">{h.planosAtivos} plano(s) ativo(s)</span></>}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Planos pedagógicos" subtitle={`${d.planosPendentes} planejado(s) aguardando início`} icon={<ClipboardList size={16} />}
            action={<Link href={`/planos?escolaId=${id}`} className="text-[12.5px] text-azulejo-700 hover:underline">Todos os planos</Link>} />
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {(Object.keys(STATUS_ROTULO) as StatusPlano[]).map(s => <Badge key={s} tone="outline">{STATUS_ROTULO[s]}: <strong className="tabular">{d.planosPorStatus[s]}</strong></Badge>)}
          </div>
          <div className="border-t border-line max-h-[360px] overflow-y-auto">
            <PlanoLista planos={d.planosAtivos} vazio="Nenhum plano ativo visível para o seu perfil" compacta />
          </div>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Sugestões para a escola</h2>
        {recs.isLoading ? <LoadingBlock /> : recs.error ? <ErrorState error={recs.error} /> : recs.data!.length === 0
          ? <Card className="p-6 text-sm text-ink-3">Nenhuma turma atende aos critérios de atenção com os filtros atuais.</Card>
          : <div className="grid gap-3 lg:grid-cols-2 items-start">{recs.data!.slice(0, 6).map((r, i) => <RecomendacaoCard key={r.chave} r={r} defaultOpen={false} podeAgir={usuario?.papel !== "GESTOR_REDE" || r.nivel === "ESCOLAR"} />)}</div>}
      </section>

      <Card className="mt-8">
        <CardHeader title="Histórico de ações" subtitle="Alterações registradas nos planos da escola visíveis para o seu perfil" icon={<History size={16} />} />
        <CardBody>
          {d.historico.length === 0 ? <p className="text-sm text-ink-3">Sem registros.</p> : (
            <ol className="relative border-l border-line ml-2 space-y-3">
              {d.historico.map(h => (
                <li key={h.evento.id} className="ml-4">
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-azulejo-500" aria-hidden />
                  <p className="text-[13px]"><strong className="font-medium">{h.evento.usuario}</strong> · {descreverEvento(h.evento)} — <Link href={`/planos/${h.planoId}`} className="text-azulejo-700 hover:underline">{h.planoTitulo}</Link></p>
                  <p className="text-xs text-ink-3">{dataHoraBR(h.evento.dataHora)}{h.evento.justificativa ? ` · “${h.evento.justificativa}”` : ""}</p>
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>
      <Nota className="mt-4">Indicadores calculados a partir dos resultados individuais da demonstração; grupos com menos de {meta.data!.minimoAgregacao} estudantes são suprimidos. {COMPONENTE_ROTULO[f.componenteId] ? `Filtro: ${COMPONENTE_ROTULO[f.componenteId]}.` : ""}</Nota>
    </div>
  );
}
