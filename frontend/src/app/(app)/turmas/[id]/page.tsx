"use client";
import { Suspense, use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, ClipboardList, GraduationCap, Plus, Search, Sparkles, Users } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/queries";
import { useFiltrosUrl } from "@/lib/filtros";
import { NIVEL_COR, cn, nivelDe, pct } from "@/lib/format";
import type { DiagnosticoTurma, Recomendacao } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, LoadingBlock, PageLoading, RestrictedNotice } from "@/components/ui/states";
import { DistribuicaoNiveis, Kpi, Nota, PageHeader, SkillTag } from "@/components/domain/kit";
import { NivelBadge, TendenciaBadge, ValorIndicador } from "@/components/domain/badges";
import { RecomendacaoCard } from "@/components/domain/recomendacao";
import { PlanoLista } from "@/components/domain/planos";
import { EvolucaoChart } from "@/components/charts/evolucao";
import { DistribuicaoChart } from "@/components/charts/distribuicao";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense fallback={<PageLoading />}><TurmaPage id={id} /></Suspense>;
}

function TurmaPage({ id }: { id: string }) {
  const { usuario } = useAuth();
  const meta = useMeta();
  const [f, set] = useFiltrosUrl(["componenteId", "avaliacaoId", "aba"] as const);
  const comp = f.componenteId || "MAT";
  const q = useQuery({ queryKey: ["turma", id, comp, f.avaliacaoId], queryFn: () => api.get<DiagnosticoTurma>(`/api/turmas/${id}` + qs({ componenteId: comp, avaliacaoId: f.avaliacaoId })) });
  const recs = useQuery({ queryKey: ["recomendacoes", "turma", id, comp, f.avaliacaoId], queryFn: () => api.get<Recomendacao[]>(`/api/recomendacoes/turmas/${id}` + qs({ componenteId: comp, avaliacaoId: f.avaliacaoId })) });
  const [busca, setBusca] = useState("");

  const estudantes = useMemo(() => (q.data?.estudantes ?? []).filter(e => e.nome.toLowerCase().includes(busca.toLowerCase()) || e.codigo.toLowerCase().includes(busca.toLowerCase())), [q.data, busca]);
  if (q.isLoading || meta.isLoading) return <PageLoading />;
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  const crit = meta.data!.criterios;
  const c = d.componentes.find(x => x.componenteId === comp)!;
  const podeCriar = usuario?.papel !== "GESTOR_REDE" && d.acessoIndividual;
  const siglas = d.matriz[0]?.pontos.map(p => p.sigla) ?? [];

  return (
    <div>
      <PageHeader
        breadcrumb={[{ href: "/rede", label: "Rede" }, { href: `/escolas/${d.escola.id}`, label: d.escola.nome }, { label: d.turma.nome }]}
        title={`${d.turma.nome} — ${d.escola.nome}`}
        description={<span className="text-ink-3 text-[13.5px]">{d.turma.turno} · {d.turma.matriculados} estudantes{d.professores.length ? ` · ${d.professores.join(", ")}` : ""}</span>}
        actions={podeCriar ? <>
          <Link href={`/assistente?turma=${id}`} className={buttonClass("secondary")}><Sparkles size={15} />Assistente docente</Link>
          <Link href={`/planos/novo?escopo=TURMA&turmaId=${id}&componenteId=${comp}`} className={buttonClass("primary")}><Plus size={15} />Plano da turma</Link>
        </> : undefined}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5" role="group" aria-label="Componente">
          {[["MAT", "Matemática"], ["LP", "Língua Portuguesa"]].map(([v, r]) => (
            <button key={v} onClick={() => set({ componenteId: v })} aria-pressed={comp === v}
              className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", comp === v ? "bg-azulejo-700 text-white" : "text-ink-2 hover:bg-canvas")}>{r}</button>
          ))}
        </div>
        <Select value={f.avaliacaoId} onChange={e => set({ avaliacaoId: e.target.value })} className="h-9 w-auto text-[13px]" aria-label="Avaliação">
          <option value="">Avaliação mais recente</option>
          {meta.data!.avaliacoes.map(a => <option key={a.id} value={a.id}>{a.sigla} · {a.nome}</option>)}
        </Select>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label={`% de acerto (${d.avaliacao.sigla})`} value={<ValorIndicador ind={c.indicador} />} sub={<span className="inline-flex gap-1">vs {d.avaliacaoAnterior?.sigla ?? "—"}: <TendenciaBadge tendencia={c.tendencia} variacao={c.variacao} /></span>} />
        <Kpi label="Estudantes na faixa adequada" value={<ValorIndicador ind={c.indicador} metrica="adequado" />} sub={`${c.indicador.adequados ?? "—"} de ${c.indicador.estudantes} avaliados`} />
        <Kpi label="Precisam de apoio" value={c.indicador.suprimido ? "—" : (c.indicador.requerAtencao ?? "—")} sub="estudantes nesta matéria" />
        <Kpi label="Avaliados" value={`${d.avaliados}/${d.turma.matriculados}`} sub={`cobertura ${pct(d.cobertura)}`} icon={<Users size={16} />} />
      </div>

      <Tabs value={f.aba || "habilidades"} onValueChange={v => set({ aba: v })}>
        <TabsList className="mb-5">
          <TabsTrigger value="habilidades">Habilidades</TabsTrigger>
          <TabsTrigger value="resultados">Evolução</TabsTrigger>
          <TabsTrigger value="estudantes">Estudantes</TabsTrigger>
          <TabsTrigger value="intervencoes">Planos ({d.planos.length})</TabsTrigger>
          <TabsTrigger value="recomendacoes">Sugestões</TabsTrigger>
        </TabsList>

        <TabsContent value="habilidades">
          <Card>
            <CardHeader title="Habilidades da turma" subtitle="% de acerto em cada avaliação. Passe o mouse na habilidade para ver a descrição completa." icon={<BookOpen size={16} />} />
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-y border-line bg-canvas/70 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
                    <th className="px-5 py-2.5 font-semibold min-w-[260px]">Habilidade</th>
                    {siglas.map(s => <th key={s} className="px-3 py-2.5 font-semibold text-center">{s}</th>)}
                    <th className="px-3 py-2.5 font-semibold">Evolução</th>
                    <th className="px-3 py-2.5 font-semibold">Situação</th>
                    <th className="px-5 py-2.5 font-semibold">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {d.matriz.map(l => (
                    <tr key={l.habilidade.id} className="border-b border-line last:border-0 align-top">
                      <td className="px-5 py-3">
                        <SkillTag id={l.habilidade.id} grupo={l.habilidade.grupo} />
                        <p className="mt-1 text-[12.5px] text-ink-2 leading-snug line-clamp-1" title={`${l.habilidade.descricao}\n\nAvaliada pelo descritor ${l.descritores.map(d => d.id + " (" + (d.statusValidacao === "VALIDADO" ? "validado" : "mapeamento demonstrativo") + ")").join(", ")}`}>{l.habilidade.descricao}</p>
                      </td>
                      {l.pontos.map(p => {
                        const v = p.indicador.suprimido ? undefined : p.indicador.percentualAcerto;
                        const n = nivelDe(v, crit);
                        return (
                          <td key={p.avaliacaoId} className="px-2 py-3 text-center">
                            <span className="inline-block min-w-[56px] rounded-md px-1.5 py-1 text-[12.5px] font-semibold tabular"
                              style={n ? { background: `color-mix(in srgb, ${NIVEL_COR[n]} 14%, white)`, color: "var(--color-ink)" } : undefined}
                              title={p.indicador.suprimido ? "suprimido (grupo pequeno)" : `${p.indicador.estudantes} estudantes`}>
                              {p.indicador.suprimido ? "supr." : pct(v)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-3"><TendenciaBadge tendencia={l.tendencia} variacao={l.variacao} compacta /></td>
                      <td className="px-3 py-3"><NivelBadge nivel={l.nivelAtual} /></td>
                      <td className="px-5 py-3 text-[12.5px]">
                        {l.planos.length > 0
                          ? <Link href={`/planos/${l.planos[0].id}`} className="inline-flex items-center gap-1 text-azulejo-700 hover:underline whitespace-nowrap"><ClipboardList size={13} />Ver plano</Link>
                          : l.nivelAtual === "REQUER_ATENCAO" && podeCriar
                            ? <button onClick={() => set({ aba: "recomendacoes" })} className="inline-flex items-center gap-1 text-terracota-600 font-medium hover:underline whitespace-nowrap"><Sparkles size={13} />Ver sugestões</button>
                            : <span className="text-ink-3">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-line"><Nota>{d.notaInterpretacao}</Nota></div>
          </Card>
        </TabsContent>

        <TabsContent value="resultados">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Evolução da turma" subtitle={`${c.nome} · avaliações comparáveis`} />
              <CardBody><EvolucaoChart criterios={crit} series={[{ nome: c.nome, pontos: c.serie.map(s => ({ sigla: s.sigla, valor: s.indicador.suprimido ? null : s.indicador.percentualAcerto })) }]} /></CardBody>
            </Card>
            <Card>
              <CardHeader title="Distribuição de resultados" subtitle={`Estudantes por faixa de acerto na ${d.avaliacao.sigla}`} />
              <CardBody>
                {c.distribuicao.length ? <DistribuicaoChart faixas={c.distribuicao} criterios={crit} /> : <p className="text-sm text-ink-3">Distribuição suprimida (grupo pequeno).</p>}
                <div className="mt-3"><DistribuicaoNiveis ind={c.indicador} /></div>
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estudantes">
          {!d.acessoIndividual ? (
            <RestrictedNotice mensagem={d.motivoRestricao ?? "Dados individuais restritos."}>
              <p className="text-[13px] text-ink-3 mt-2">Na demonstração, use “Trocar perfil” no topo para entrar como a professora responsável e ver como o acesso individual funciona.</p>
            </RestrictedNotice>
          ) : (
            <Card>
              <CardHeader title="Estudantes" subtitle="Quem precisa de apoio, e em quê (última avaliação)"
                action={<div className="relative"><Search size={14} className="absolute left-2.5 top-3 text-ink-3" /><Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar estudante" className="h-9 pl-8 w-48" aria-label="Buscar estudante" /></div>} />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-y border-line bg-canvas/70 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
                      <th className="px-5 py-2.5 font-semibold">Estudante (fictício)</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Matemática</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Língua Port.</th>
                      <th className="px-3 py-2.5 font-semibold">Precisa de apoio em</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Planos</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {estudantes.map(e => (
                      <tr key={e.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                        <td className="px-5 py-2.5"><span className="font-medium">{e.nome}</span><span className="block text-[11.5px] text-ink-3 font-mono">{e.codigo}</span></td>
                        {["MAT", "LP"].map(k => (
                          <td key={k} className="px-3 py-2.5 text-right tabular">
                            {e.percentuais[k] !== undefined ? <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: NIVEL_COR[e.niveis[k]] }} aria-hidden />{pct(e.percentuais[k])}</span> : <span className="text-ink-3 text-xs">não avaliado</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{e.habilidadesAtencaoIds.length ? e.habilidadesAtencaoIds.map(h => <SkillTag key={h} id={h} />) : <span className="text-xs text-ink-3">nenhuma</span>}</div></td>
                        <td className="px-3 py-2.5 text-right tabular">{e.planosAtivos}</td>
                        <td className="px-5 py-2.5 text-right"><Link href={`/estudantes/${e.id}`} className="inline-flex items-center gap-1 text-azulejo-700 font-medium hover:underline">Perfil<ArrowRight size={14} /></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="intervencoes">
          <Card><PlanoLista planos={d.planos} vazio="Nenhum plano registrado para esta turma" /></Card>
        </TabsContent>

        <TabsContent value="recomendacoes">
          {recs.isLoading ? <LoadingBlock /> : recs.error ? <ErrorState error={recs.error} /> : recs.data!.length === 0
            ? <Card className="p-6 text-sm text-ink-3">Nenhuma habilidade da turma atende aos critérios de atenção neste componente.</Card>
            : <div className="grid gap-3 lg:grid-cols-2 items-start">{recs.data!.map((r, i) => <RecomendacaoCard key={r.chave} r={r} defaultOpen={i === 0} podeAgir={podeCriar} />)}</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
