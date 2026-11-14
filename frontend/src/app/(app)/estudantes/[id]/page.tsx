"use client";
import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Plus, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/queries";
import { COMPONENTE_ROTULO, NIVEL_COR, NIVEL_ROTULO, cn, dataBR, pct } from "@/lib/format";
import type { Nivel, PerfilEstudante, Recomendacao } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, LoadingBlock, PageLoading } from "@/components/ui/states";
import { Nota, PageHeader, SkillTag } from "@/components/domain/kit";
import { NivelBadge, TendenciaBadge } from "@/components/domain/badges";
import { PlanoLista } from "@/components/domain/planos";
import { ListaSugestoes } from "@/components/domain/assistente";
import { EvolucaoChart } from "@/components/charts/evolucao";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense fallback={<PageLoading />}><Perfil id={id} /></Suspense>;
}

function Perfil({ id }: { id: string }) {
  const { usuario } = useAuth();
  const meta = useMeta();
  const q = useQuery({ queryKey: ["estudante", id], queryFn: () => api.get<PerfilEstudante>(`/api/estudantes/${id}`) });
  const recs = useQuery({ queryKey: ["recomendacoes", "estudante", id], queryFn: () => api.get<Recomendacao[]>(`/api/recomendacoes/estudantes/${id}`), enabled: q.isSuccess });
  const [reav, setReav] = useState(false);
  const [aba, setAba] = useState("assistente");

  if (q.isLoading || meta.isLoading) return <PageLoading />;
  if (q.error) return <ErrorState error={q.error} />;
  const d = q.data!;
  const crit = meta.data!.criterios;
  const ordem: Nivel[] = ["REQUER_ATENCAO", "EM_DESENVOLVIMENTO", "ADEQUADO"];
  const podeAgir = usuario?.papel !== "GESTOR_REDE";

  return (
    <div>
      <PageHeader
        breadcrumb={[{ href: `/escolas/${d.escola.id}`, label: d.escola.nome }, { href: `/turmas/${d.turma.id}`, label: d.turma.nome }, { label: d.estudante.nome }]}
        title={<span className="inline-flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-azulejo-50 text-azulejo-700"><UserRound size={22} /></span>{d.estudante.nome}</span>}
        description={<span className="text-ink-3 text-[13.5px]">{d.turma.nome} · {d.escola.nome} · {d.estudante.codigo}</span>}
        actions={podeAgir ? <>
          <Button variant="secondary" onClick={() => setReav(true)}><ClipboardCheck size={15} />Registrar reavaliação</Button>
          <Link href={`/planos/novo?escopo=ESTUDANTE&estudanteId=${id}`} className={buttonClass("primary")}><Plus size={15} />Plano individual</Link>
        </> : undefined}
      />

      <Card className="mb-5 p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-3">
          {ordem.map(n => {
            const lista = d.habilidades.filter(h => h.nivelAtual === n);
            return (
              <div key={n}>
                <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: NIVEL_COR[n] }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: NIVEL_COR[n] }} />
                  {n === "REQUER_ATENCAO" ? "Precisa de apoio em" : n === "EM_DESENVOLVIMENTO" ? "Avançando em" : "Vai bem em"}
                  <span className="text-ink-3 font-normal">({lista.length})</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lista.length === 0 ? <span className="text-[12.5px] text-ink-3">—</span> : lista.map(h => (
                    <span key={h.habilidade.id} className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[12.5px] text-ink-2" title={h.habilidade.descricao}>
                      {h.habilidade.grupo} <span className="font-mono text-[10.5px] text-ink-3">{h.habilidade.id}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-ink-3"><ShieldCheck size={13} />Resultado da última avaliação, não um rótulo. Acesso restrito e registrado.</p>
      </Card>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="mb-5">
          <TabsTrigger value="assistente">O que fazer {recs.data ? `(${recs.data.length})` : ""}</TabsTrigger>
          <TabsTrigger value="mapa">Habilidades</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="planos">Planos ({d.planos.length + d.intervencoesAnteriores.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="mapa">
          {["MAT", "LP"].map(comp => (
            <div key={comp} className="mb-6">
              <h2 className="text-base font-semibold mb-3">{COMPONENTE_ROTULO[comp]}</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {d.habilidades.filter(h => h.habilidade.componenteId === comp)
                  .sort((a, b) => ordem.indexOf(a.nivelAtual ?? "ADEQUADO") - ordem.indexOf(b.nivelAtual ?? "ADEQUADO"))
                  .map(h => (
                    <Card key={h.habilidade.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <SkillTag id={h.habilidade.id} grupo={h.habilidade.grupo} />
                        <NivelBadge nivel={h.nivelAtual} />
                      </div>
                      <div className="mt-3 flex items-end gap-2" aria-label="Resultados por avaliação">
                        {h.resultados.map(r => (
                          <div key={r.avaliacaoId} className="flex-1 text-center">
                            <div className="h-14 flex items-end justify-center rounded bg-canvas">
                              {r.percentual !== undefined && r.percentual !== null
                                ? <div className="w-6 rounded-t" style={{ height: `${Math.max(6, r.percentual)}%`, background: NIVEL_COR[r.nivel!] }} title={`${r.acertos}/${r.itens}`} />
                                : <span className="text-[10px] text-ink-3 mb-1">ausente</span>}
                            </div>
                            <p className="text-[11px] text-ink-3 mt-1">{r.sigla}</p>
                            <p className="text-[11.5px] font-semibold tabular">{r.acertos !== undefined && r.acertos !== null ? `${r.acertos}/${r.itens}` : "—"}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-3">
                        <TendenciaBadge tendencia={h.tendencia} variacao={h.variacao} compacta />
                        <span>Turma: {pct(h.percentualTurma)}</span>
                      </div>
                      {h.reavaliacoesDirecionadas.length > 0 && (
                        <div className="mt-2 rounded-md bg-terracota-50 px-2 py-1.5 text-[11.5px] text-ink-2">
                          <strong>Reavaliação direcionada</strong> (outro instrumento, não comparável):{" "}
                          {h.reavaliacoesDirecionadas.map(rd => `${dataBR(rd.data)}: ${rd.acertos}/${rd.itens}`).join(" · ")}
                        </div>
                      )}
                    </Card>
                  ))}
              </div>
            </div>
          ))}
          <Nota>Adequado ≥ {crit.adequado}% · precisa de apoio &lt; {crit.atencao}%. Poucos itens por habilidade: leia variações com cautela.</Nota>
        </TabsContent>

        <TabsContent value="assistente">
          {recs.isLoading ? <LoadingBlock /> : recs.error ? <ErrorState error={recs.error} /> : recs.data!.length === 0
            ? <Card className="p-6 text-sm text-ink-3">Todas as habilidades estão na faixa adequada na última avaliação.</Card>
            : <ListaSugestoes recs={recs.data!} podeAgir={podeAgir} />}
        </TabsContent>

        <TabsContent value="evolucao">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader title="Evolução por componente" subtitle="Somente avaliações comparáveis (mesma matriz de referência)" />
              <CardBody>
                <EvolucaoChart criterios={crit} series={["MAT", "LP"].map(c => ({ nome: COMPONENTE_ROTULO[c], pontos: d.avaliacoes.map(a => ({ sigla: a.sigla, valor: a.porComponente[c]?.percentual ?? null })) }))} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Histórico de avaliações" />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="border-y border-line bg-canvas/70 text-left text-[11.5px] uppercase text-ink-3"><th className="px-4 py-2">Avaliação</th><th className="px-3 py-2 text-right">Mat.</th><th className="px-4 py-2 text-right">LP</th></tr></thead>
                  <tbody>
                    {d.avaliacoes.map(a => (
                      <tr key={a.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-2.5"><span className="font-medium">{a.sigla}</span><span className="block text-xs text-ink-3">{a.nome} · {dataBR(a.data)}</span></td>
                        {["MAT", "LP"].map(c => (
                          <td key={c} className="px-3 py-2.5 text-right tabular">{a.porComponente[c] ? <>{pct(a.porComponente[c].percentual)}<span className="block text-[11px] text-ink-3">{a.porComponente[c].acertos}/{a.porComponente[c].itens} itens</span></> : <span className="text-xs text-ink-3">não avaliado</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4"><Nota>A evolução mostra associação temporal. Ela não comprova que uma intervenção específica causou a mudança.</Nota></div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="planos">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><CardHeader title="Próximas ações e planos ativos" /><PlanoLista planos={d.planos} vazio="Nenhum plano ativo para este estudante" /></Card>
            <Card><CardHeader title="Intervenções anteriores" subtitle="Concluídas ou reavaliadas, com a decisão registrada" /><PlanoLista planos={d.intervencoesAnteriores} vazio="Sem intervenções anteriores registradas" /></Card>
          </div>
        </TabsContent>
      </Tabs>

      <ReavaliacaoDialog open={reav} onOpenChange={setReav} perfil={d} />
    </div>
  );
}

function ReavaliacaoDialog({ open, onOpenChange, perfil }: { open: boolean; onOpenChange: (o: boolean) => void; perfil: PerfilEstudante }) {
  const qc = useQueryClient();
  const meta = useMeta();
  const [form, setForm] = useState({ habilidadeId: "", data: "", acertos: "", itens: "5", planoId: "", observacao: "" });
  const m = useMutation({
    mutationFn: () => api.post<{ mensagem: string }>(`/api/estudantes/${perfil.estudante.id}/reavaliacoes`, {
      habilidadeId: form.habilidadeId, data: form.data, acertos: Number(form.acertos), itens: Number(form.itens),
      planoId: form.planoId ? Number(form.planoId) : undefined, observacao: form.observacao || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["estudante"] }); qc.invalidateQueries({ queryKey: ["plano"] }); onOpenChange(false); },
  });
  const ok = form.habilidadeId && form.data && form.acertos !== "" && Number(form.acertos) <= Number(form.itens);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Registrar reavaliação direcionada"
      description="Itens equivalentes aplicados pelo(a) professor(a). Por ser outro instrumento, o resultado é exibido separadamente e não entra nas séries comparáveis da rede.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Habilidade" required className="sm:col-span-2">
          <Select value={form.habilidadeId} onChange={e => setForm({ ...form, habilidadeId: e.target.value })}>
            <option value="">Selecione</option>
            {perfil.habilidades.map(h => <option key={h.habilidade.id} value={h.habilidade.id}>{h.habilidade.id} · {h.habilidade.grupo}</option>)}
          </Select>
        </Field>
        <Field label="Data de aplicação" required><Input type="date" max={meta.data?.dataReferencia} value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Acertos" required><Input type="number" min={0} value={form.acertos} onChange={e => setForm({ ...form, acertos: e.target.value })} /></Field>
          <Field label="Itens" required><Input type="number" min={1} max={50} value={form.itens} onChange={e => setForm({ ...form, itens: e.target.value })} /></Field>
        </div>
        <Field label="Vincular a plano (opcional)" className="sm:col-span-2">
          <Select value={form.planoId} onChange={e => setForm({ ...form, planoId: e.target.value })}>
            <option value="">Nenhum</option>
            {perfil.planos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
          </Select>
        </Field>
        <Field label="Observação" className="sm:col-span-2"><Textarea value={form.observacao} maxLength={600} onChange={e => setForm({ ...form, observacao: e.target.value })} /></Field>
      </div>
      {m.error && <p className="mt-3 text-sm text-atencao">{(m.error as Error).message}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button disabled={!ok || m.isPending} onClick={() => m.mutate()} className={cn(!ok && "opacity-60")}>Registrar</Button>
      </div>
    </Dialog>
  );
}
