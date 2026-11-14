"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Circle, ClipboardCheck, GitBranch, History, Pencil, Plus, Play, RotateCcw, ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { useMeta } from "@/lib/queries";
import { COMPONENTE_ROTULO, DECISAO_ROTULO, ESCOPO_ROTULO, STATUS_ROTULO, cn, dataBR, dataHoraBR, pct, pp } from "@/lib/format";
import { descreverEvento } from "@/lib/eventos";
import type { Decisao, Evidencia, PlanoDetalhe, StatusPlano } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ErrorState, LoadingBlock, PageLoading } from "@/components/ui/states";
import { Nota, PageHeader, SkillTag } from "@/components/domain/kit";
import { EscopoBadge, StatusBadge, TendenciaBadge } from "@/components/domain/badges";
import { PlanoLinha } from "@/components/domain/planos";
import { EvolucaoChart } from "@/components/charts/evolucao";

const CICLO: StatusPlano[] = ["PLANEJADO", "EM_ANDAMENTO", "CONCLUIDO", "REAVALIADO"];
const ACAO_ROTULO = { PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento", CONCLUIDA: "Concluída" } as const;
const PERCEPCAO: Record<string, { rot: string; tone: "green" | "neutral" | "red" }> = {
  AVANCO: { rot: "Avanço", tone: "green" }, ESTAVEL: { rot: "Estável", tone: "neutral" }, DIFICULDADE: { rot: "Dificuldade", tone: "red" },
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const meta = useMeta();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["plano", id], queryFn: () => api.get<PlanoDetalhe>(`/api/planos/${id}`) });
  const ev = useQuery({ queryKey: ["plano", id, "evidencia"], queryFn: () => api.get<Evidencia>(`/api/planos/${id}/evidencia`), enabled: q.isSuccess });
  const [transicao, setTransicao] = useState<StatusPlano | null>(null);
  const [reavaliar, setReavaliar] = useState(false);

  const atualizar = (p: PlanoDetalhe) => { qc.setQueryData(["plano", id], p); qc.invalidateQueries({ queryKey: ["planos"] }); qc.invalidateQueries({ queryKey: ["plano", id, "evidencia"] }); };

  if (q.isLoading || meta.isLoading) return <PageLoading />;
  if (q.error) return <ErrorState error={q.error} />;
  const p = q.data!;
  const crit = meta.data!.criterios;
  const idx = CICLO.indexOf(p.status);
  const alvo = p.estudante?.nome ?? p.turma?.nome ?? p.escola?.nome ?? p.territorio?.nome;

  return (
    <div>
      <PageHeader
        breadcrumb={[{ href: "/planos", label: "Planos de ação" }, { label: `#${p.id}` }]}
        eyebrow={`Plano ${ESCOPO_ROTULO[p.escopo].toLowerCase()} · ${COMPONENTE_ROTULO[p.componenteId]}`}
        title={p.titulo}
        description={<span className="inline-flex flex-wrap items-center gap-2"><StatusBadge status={p.status} /><EscopoBadge escopo={p.escopo} />
          {p.atrasado && <Badge tone="red"><AlertTriangle size={11} />Prazo vencido</Badge>}
          <span className="text-ink-3 text-[13px]">{alvo}{p.escola && p.escopo !== "ESCOLA" ? ` · ${p.escola.nome}` : ""} · criado por {p.criadoPor} em {dataBR(p.criadoEm)}</span></span>}
        actions={p.podeEditar ? <>
          {p.status !== "REAVALIADO" && <Link href={`/planos/${p.id}/editar`} className={buttonClass("secondary")}><Pencil size={15} />Editar</Link>}
          {p.proximosStatus.filter(s => s !== "REAVALIADO").map(s => {
            const volta = CICLO.indexOf(s) < idx;
            return <Button key={s} variant={volta ? "secondary" : "primary"} onClick={() => setTransicao(s)}>
              {volta ? <RotateCcw size={15} /> : s === "EM_ANDAMENTO" ? <Play size={15} /> : <Check size={15} />}
              {volta ? (p.status === "REAVALIADO" ? "Ajustar e retomar" : s === "PLANEJADO" ? "Voltar a planejado" : "Retomar execução") : s === "EM_ANDAMENTO" ? "Iniciar execução" : "Concluir execução"}
            </Button>;
          })}
          {p.status === "CONCLUIDO" && <Button variant="accent" onClick={() => setReavaliar(true)}><ClipboardCheck size={15} />Registrar reavaliação</Button>}
        </> : <Badge tone="outline">Somente leitura para o seu perfil</Badge>}
      />

      {/* Ciclo */}
      <Card className="mb-5 p-4">
        <ol className="grid grid-cols-2 md:grid-cols-4 gap-2" aria-label="Ciclo do plano">
          {CICLO.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-[13px]", i < idx ? "text-adequado" : i === idx ? "bg-azulejo-50 text-azulejo-700 font-semibold" : "text-ink-3")}
              aria-current={i === idx ? "step" : undefined}>
              {i < idx ? <CheckCircle2 size={16} /> : <Circle size={16} className={i === idx ? "fill-azulejo-700 text-azulejo-700" : ""} />}
              {STATUS_ROTULO[s]}
            </li>
          ))}
        </ol>
      </Card>

      {p.status === "REAVALIADO" && p.resultadoObservado && (
        <Card className="mb-5 border-terracota-500/30 bg-terracota-50/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-terracota-600">Resultado observado e decisão</p>
          <p className="mt-1 text-[14px] text-ink leading-relaxed">{p.resultadoObservado}</p>
          {p.decisaoReavaliacao && <p className="mt-2"><Badge tone={p.decisaoReavaliacao === "FUNCIONOU" ? "green" : p.decisaoReavaliacao === "AJUSTAR" ? "amber" : "red"}>{DECISAO_ROTULO[p.decisaoReavaliacao]}</Badge></p>}
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Resumo do plano" icon={<ScrollText size={16} />} />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2 text-[13.5px]">
                <Item rot="O que será feito" full>{p.estrategia}</Item>
                <Item rot="Responsável">{p.responsavel}</Item>
                <Item rot="Período">{dataBR(p.dataInicio)} a {dataBR(p.prazo)}</Item>
                <Item rot="Como acompanhar" full>{p.indicadorAcompanhamento}</Item>
                <Item rot="Habilidades" full><div className="flex flex-wrap gap-1">{p.habilidades.map(h => <SkillTag key={h} id={h} />)}</div></Item>
              </dl>
              <details className="mt-4 border-t border-line pt-3">
                <summary className="cursor-pointer text-[13px] font-medium text-azulejo-700">Ver plano completo (problema, evidências, objetivo, critérios)</summary>
                <dl className="mt-3 grid gap-x-6 gap-y-4 md:grid-cols-2 text-[13.5px]">
                  <Item rot="Problema identificado" full>{p.problema}</Item>
                  <Item rot="Evidências" full>{p.evidencias}</Item>
                  <Item rot="Objetivo pedagógico" full>{p.objetivo}</Item>
                  <Item rot="Público atendido">{p.publicoAlvo}</Item>
                  <Item rot="Critério de conclusão">{p.criterioConclusao}</Item>
                  <Item rot="Resultado esperado" full>{p.resultadoEsperado}</Item>
                  {p.formacao && <Item rot="Formação relacionada" full><Link href="/formacao" className="text-azulejo-700 hover:underline">{p.formacao.nome}</Link></Item>}
                </dl>
              </details>
            </CardBody>
          </Card>

          <Acoes p={p} onAtualizar={atualizar} />
          <Registros p={p} onAtualizar={atualizar} hoje={meta.data!.dataReferencia} />
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="O que mudou depois?" subtitle={ev.data ? `${ev.data.recorte} · avaliações comparáveis` : "Evidência antes/depois"} />
            <CardBody>
              {ev.isLoading ? <LoadingBlock /> : ev.error ? <ErrorState error={ev.error} /> : ev.data && (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <Mini rot={`Linha de base${ev.data.avaliacaoBase ? ` (${ev.data.avaliacaoBase})` : ""}`} val={pct(ev.data.percentualAntes)} />
                    <Mini rot={`Depois${ev.data.avaliacaoPosterior ? ` (${ev.data.avaliacaoPosterior})` : ""}`} val={ev.data.aguardandoAvaliacao ? "aguardando" : pct(ev.data.percentualDepois)} />
                    <Mini rot="Variação" val={ev.data.variacao !== undefined && ev.data.variacao !== null ? pp(ev.data.variacao) : "—"} extra={<TendenciaBadge tendencia={ev.data.tendencia} compacta />} />
                  </div>
                  <EvolucaoChart criterios={crit} altura={200}
                    series={[{ nome: "Habilidades do plano", pontos: ev.data.combinado.map(c => ({ sigla: `${c.sigla}${c.momento === "BASE" ? " (base)" : c.momento === "POSTERIOR" ? " (depois)" : ""}`, valor: c.indicador.suprimido ? null : c.indicador.percentualAcerto })) }]} />
                  {ev.data.porHabilidade.length > 1 && (
                    <table className="mt-3 w-full text-[12.5px]">
                      <thead><tr className="text-left text-ink-3"><th className="py-1 font-medium">Habilidade</th>{ev.data.combinado.map(c => <th key={c.avaliacaoId} className="py-1 font-medium text-right">{c.sigla}</th>)}</tr></thead>
                      <tbody>{ev.data.porHabilidade.map(h => (
                        <tr key={h.habilidadeId} className="border-t border-line"><td className="py-1.5 font-mono">{h.habilidadeId}</td>
                          {h.pontos.map(pt => <td key={pt.avaliacaoId} className="py-1.5 text-right tabular">{pt.indicador.suprimido ? "supr." : pct(pt.indicador.percentualAcerto)}</td>)}</tr>
                      ))}</tbody>
                    </table>
                  )}
                  {ev.data.reavaliacoesDirecionadas.length > 0 && (
                    <div className="mt-3 rounded-lg bg-terracota-50 px-3 py-2 text-[12.5px]">
                      <strong>Reavaliações direcionadas</strong> (instrumento docente, não comparável):
                      <ul className="mt-1">{ev.data.reavaliacoesDirecionadas.map(r => <li key={r.avaliacaoId + r.habilidadeId}>{dataBR(r.data)} · {r.habilidadeId}: {r.acertos}/{r.itens} ({pct(r.percentual)}){r.registradoPor ? ` — ${r.registradoPor}` : ""}</li>)}</ul>
                    </div>
                  )}
                  {ev.data.aguardandoAvaliacao && <p className="mt-3 text-[13px] text-ink-2">Ainda não há avaliação comparável aplicada após o início do plano. Use reavaliações direcionadas para acompanhar o progresso.</p>}
                  <Nota className="mt-3">{ev.data.aviso}</Nota>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Planos relacionados" subtitle="Como as prioridades da gestão se traduzem em ações" icon={<GitBranch size={16} />} />
            <div className="border-t border-line">
              {p.planoPai && <div><p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Vinculado a</p><PlanoLinha p={p.planoPai} compacta /></div>}
              {p.planosVinculados.length > 0 && <div><p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Planos derivados</p>{p.planosVinculados.map(x => <PlanoLinha key={x.id} p={x} compacta />)}</div>}
              {p.planosVinculadosOcultos > 0 && <p className="px-4 py-3 text-xs text-ink-3">+ {p.planosVinculadosOcultos} plano(s) derivado(s) fora do seu escopo de acesso (ex.: planos individuais).</p>}
              {!p.planoPai && p.planosVinculados.length === 0 && p.planosVinculadosOcultos === 0 && <p className="px-4 py-4 text-sm text-ink-3">Sem vínculos.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Histórico de alterações" icon={<History size={16} />} />
            <CardBody>
              <ol className="relative border-l border-line ml-2 space-y-3">
                {p.historico.map(h => (
                  <li key={h.id} className="ml-4">
                    <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-azulejo-500" aria-hidden />
                    <p className="text-[13px]"><strong className="font-medium">{h.usuario}</strong> {descreverEvento(h)}</p>
                    {h.justificativa && <p className="text-[12.5px] text-ink-2">Justificativa: “{h.justificativa}”</p>}
                    <p className="text-xs text-ink-3">{dataHoraBR(h.dataHora)}</p>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      <TransicaoDialog plano={p} destino={transicao} onClose={() => setTransicao(null)} onOk={atualizar} />
      <ReavaliacaoDialog plano={p} evidencia={ev.data} open={reavaliar} onClose={() => setReavaliar(false)} onOk={atualizar} />
    </div>
  );
}

function Item({ rot, children, full }: { rot: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "md:col-span-2" : ""}><dt className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">{rot}</dt><dd className="mt-0.5 text-ink leading-relaxed">{children}</dd></div>;
}
function Mini({ rot, val, extra }: { rot: string; val: string; extra?: React.ReactNode }) {
  return <div className="rounded-lg border border-line p-3"><p className="text-[11.5px] text-ink-3">{rot}</p><p className="text-lg font-bold font-display tabular">{val}</p>{extra}</div>;
}

function Acoes({ p, onAtualizar }: { p: PlanoDetalhe; onAtualizar: (p: PlanoDetalhe) => void }) {
  const [nova, setNova] = useState({ descricao: "", responsavel: p.responsavel, dataPrevista: p.dataInicio });
  const [aberto, setAberto] = useState(false);
  const status = useMutation({ mutationFn: (a: { id: number; status: string }) => api.patch<PlanoDetalhe>(`/api/planos/${p.id}/acoes/${a.id}`, { status: a.status }), onSuccess: onAtualizar });
  const add = useMutation({ mutationFn: () => api.post<PlanoDetalhe>(`/api/planos/${p.id}/acoes`, nova), onSuccess: d => { onAtualizar(d); setAberto(false); setNova({ ...nova, descricao: "" }); } });
  const conc = p.acoes.filter(a => a.status === "CONCLUIDA").length;
  return (
    <Card>
      <CardHeader title="Ações pedagógicas" subtitle={`${conc} de ${p.acoes.length} concluída(s)`}
        action={p.podeEditar && p.status !== "REAVALIADO" ? <Button size="sm" variant="secondary" onClick={() => setAberto(!aberto)}><Plus size={14} />Ação</Button> : undefined} />
      {p.acoes.length > 0 && <div className="mx-5 mb-3 h-1.5 rounded-full bg-canvas overflow-hidden"><div className="h-full bg-adequado" style={{ width: `${(100 * conc) / p.acoes.length}%` }} /></div>}
      <ul className="border-t border-line">
        {p.acoes.map(a => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 border-b border-line last:border-0">
            {a.status === "CONCLUIDA" ? <CheckCircle2 size={17} className="text-adequado shrink-0" /> : <Circle size={17} className={cn("shrink-0", a.status === "EM_ANDAMENTO" ? "text-azulejo-500" : "text-ink-3")} />}
            <div className="flex-1 min-w-[200px]">
              <p className={cn("text-[13.5px]", a.status === "CONCLUIDA" && "text-ink-2")}>{a.descricao}</p>
              <p className="text-xs text-ink-3">{a.responsavel} · previsto {dataBR(a.dataPrevista)}{a.concluidaEm ? ` · concluída em ${dataBR(a.concluidaEm)}` : ""}</p>
            </div>
            {p.podeEditar && p.status !== "REAVALIADO" ? (
              <Select value={a.status} onChange={e => status.mutate({ id: a.id, status: e.target.value })} className="h-8 w-40 text-[12.5px]" aria-label="Situação da ação">
                {Object.entries(ACAO_ROTULO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            ) : <Badge tone="outline">{ACAO_ROTULO[a.status]}</Badge>}
          </li>
        ))}
        {p.acoes.length === 0 && <li className="px-5 py-4 text-sm text-ink-3">Nenhuma ação registrada.</li>}
      </ul>
      {aberto && (
        <div className="border-t border-line p-4 grid gap-2 md:grid-cols-[1fr_180px_150px_auto]">
          <Input placeholder="Descrição da ação" value={nova.descricao} onChange={e => setNova({ ...nova, descricao: e.target.value })} aria-label="Descrição" />
          <Input value={nova.responsavel} onChange={e => setNova({ ...nova, responsavel: e.target.value })} aria-label="Responsável" />
          <Input type="date" min={p.dataInicio} value={nova.dataPrevista} onChange={e => setNova({ ...nova, dataPrevista: e.target.value })} aria-label="Data prevista" />
          <Button size="md" disabled={nova.descricao.trim().length < 3 || add.isPending} onClick={() => add.mutate()}>Adicionar</Button>
          {add.error && <p className="text-sm text-atencao md:col-span-4">{(add.error as Error).message}</p>}
        </div>
      )}
    </Card>
  );
}

function Registros({ p, onAtualizar, hoje }: { p: PlanoDetalhe; onAtualizar: (p: PlanoDetalhe) => void; hoje: string }) {
  const minimo = p.dataInicio < p.criadoEm.slice(0, 10) ? p.dataInicio : p.criadoEm.slice(0, 10);
  const [f, setF] = useState({ tipo: "EXECUCAO", data: hoje, descricao: "", percepcao: "AVANCO" });
  const m = useMutation({ mutationFn: () => api.post<PlanoDetalhe>(`/api/planos/${p.id}/registros`, f), onSuccess: d => { onAtualizar(d); setF({ ...f, descricao: "" }); } });
  const podeRegistrar = p.podeEditar && p.status !== "PLANEJADO";
  return (
    <Card>
      <CardHeader title="Diário do plano" subtitle="O que foi feito e o que você observou" />
      {podeRegistrar && (
        <div className="px-5 pb-4 grid gap-2 md:grid-cols-[150px_150px_150px] border-b border-line">
          <Select value={f.tipo} onChange={e => setF({ ...f, tipo: e.target.value })} aria-label="Tipo"><option value="EXECUCAO">Execução</option><option value="ACOMPANHAMENTO">Acompanhamento</option></Select>
          <Input type="date" min={minimo} max={hoje} value={f.data} onChange={e => setF({ ...f, data: e.target.value })} aria-label="Data" />
          <Select value={f.percepcao} onChange={e => setF({ ...f, percepcao: e.target.value })} aria-label="Percepção"><option value="AVANCO">Avanço</option><option value="ESTAVEL">Estável</option><option value="DIFICULDADE">Dificuldade</option></Select>
          <Textarea className="md:col-span-3 min-h-[64px]" placeholder="Ex.: hoje usamos tiras de frações; 4 alunos já nomeiam metades sem ajuda." value={f.descricao} maxLength={1500} onChange={e => setF({ ...f, descricao: e.target.value })} aria-label="Descrição do registro" />
          {m.error && <p className="text-sm text-atencao md:col-span-3">{(m.error as Error).message}</p>}
          <div className="md:col-span-3 flex justify-end"><Button size="sm" disabled={f.descricao.trim().length < 5 || m.isPending} onClick={() => m.mutate()}>Registrar</Button></div>
        </div>
      )}
      {p.podeEditar && p.status === "PLANEJADO" && <p className="px-5 pb-4 text-[13px] text-ink-3 border-b border-line">Inicie a execução para registrar o acompanhamento.</p>}
      <ul>
        {p.registros.map(r => (
          <li key={r.id} className="px-5 py-3 border-b border-line last:border-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
              <Badge tone={r.tipo === "REAVALIACAO" ? "terracota" : "outline"}>{r.tipo === "EXECUCAO" ? "Execução" : r.tipo === "ACOMPANHAMENTO" ? "Acompanhamento" : "Reavaliação"}</Badge>
              {r.percepcao && <Badge tone={PERCEPCAO[r.percepcao].tone}>{PERCEPCAO[r.percepcao].rot}</Badge>}
              <span>{dataBR(r.data)} · {r.autor}</span>
            </div>
            <p className="mt-1 text-[13.5px] text-ink-2 leading-relaxed">{r.descricao}</p>
          </li>
        ))}
        {p.registros.length === 0 && <li className="px-5 py-4 text-sm text-ink-3">Nenhum registro ainda.</li>}
      </ul>
    </Card>
  );
}

function TransicaoDialog({ plano, destino, onClose, onOk }: { plano: PlanoDetalhe; destino: StatusPlano | null; onClose: () => void; onOk: (p: PlanoDetalhe) => void }) {
  const [just, setJust] = useState("");
  const volta = destino ? CICLO.indexOf(destino) < CICLO.indexOf(plano.status) : false;
  const m = useMutation({
    mutationFn: () => api.post<PlanoDetalhe>(`/api/planos/${plano.id}/status`, { status: destino, justificativa: just || undefined }),
    onSuccess: p => { onOk(p); onClose(); setJust(""); },
  });
  if (!destino) return null;
  return (
    <Dialog open={!!destino} onOpenChange={o => !o && onClose()} title={`${STATUS_ROTULO[plano.status]} → ${STATUS_ROTULO[destino]}`}
      description={volta ? "Revisões de situação exigem justificativa e ficam registradas no histórico." : "A mudança fica registrada no histórico do plano."}>
      <Field label={volta ? "Justificativa" : "Observação (opcional)"} required={volta}>
        <Textarea value={just} onChange={e => setJust(e.target.value)} maxLength={1000} />
      </Field>
      {m.error && <p className="mt-2 text-sm text-atencao">{(m.error as Error).message}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={(volta && just.trim().length < 5) || m.isPending} onClick={() => m.mutate()}>Confirmar</Button>
      </div>
    </Dialog>
  );
}

function ReavaliacaoDialog({ plano, evidencia, open, onClose, onOk }: { plano: PlanoDetalhe; evidencia?: Evidencia; open: boolean; onClose: () => void; onOk: (p: PlanoDetalhe) => void }) {
  const sugestao = evidencia && !evidencia.aguardandoAvaliacao && evidencia.percentualAntes !== undefined
    ? `Nas habilidades do plano, o percentual de acerto passou de ${pct(evidencia.percentualAntes)} (${evidencia.avaliacaoBase}) para ${pct(evidencia.percentualDepois)} (${evidencia.avaliacaoPosterior}). `
    : "";
  const [texto, setTexto] = useState("");
  const [decisao, setDecisao] = useState<Decisao | "">("");
  const [just, setJust] = useState("");
  const m = useMutation({
    mutationFn: () => api.post<PlanoDetalhe>(`/api/planos/${plano.id}/reavaliacao`, { resultadoObservado: texto, decisao, justificativa: just || undefined }),
    onSuccess: p => { onOk(p); onClose(); },
  });
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()} wide title="Registrar reavaliação"
      description="Descreva o resultado observado e decida o que fazer com a estratégia. A decisão é profissional; o sistema apenas apresenta as evidências.">
      <div className="space-y-3">
        {sugestao && <div className="rounded-lg bg-canvas border border-line p-3 text-[13px]"><p className="text-ink-2">{sugestao}</p><Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => setTexto(sugestao + texto)}>Usar este dado no texto</Button></div>}
        <Field label="Resultado observado após a intervenção" required><Textarea value={texto} onChange={e => setTexto(e.target.value)} maxLength={1500} className="min-h-[110px]" /></Field>
        <fieldset>
          <legend className="text-[13px] font-medium text-ink-2 mb-1.5">A estratégia… <span className="text-atencao">*</span></legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(DECISAO_ROTULO) as Decisao[]).map(d => (
              <label key={d} className={cn("rounded-lg border px-3 py-2.5 text-[13px] cursor-pointer", decisao === d ? "border-azulejo-500 bg-azulejo-50" : "border-line hover:bg-canvas")}>
                <input type="radio" name="decisao" className="mr-2 accent-azulejo-700" checked={decisao === d} onChange={() => setDecisao(d)} />{DECISAO_ROTULO[d]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Justificativa / próximos passos"><Input value={just} onChange={e => setJust(e.target.value)} maxLength={1000} /></Field>
      </div>
      {m.error && <p className="mt-2 text-sm text-atencao">{(m.error as Error).message}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={texto.trim().length < 5 || !decisao || m.isPending} onClick={() => m.mutate()}>Registrar reavaliação<ArrowRight size={14} /></Button>
      </div>
    </Dialog>
  );
}
