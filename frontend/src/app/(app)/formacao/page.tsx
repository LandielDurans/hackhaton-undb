"use client";
import { Suspense, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BookMarked, CalendarDays, CheckCircle2, Clock, GraduationCap, Sparkles, Users } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/queries";
import { useFiltrosUrl } from "@/lib/filtros";
import { FORMACAO_STATUS, MODALIDADE, dataBR, pct } from "@/lib/format";
import type { Demandas, FormacaoView, ParticipacaoView } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { ErrorState, LoadingBlock, PageLoading } from "@/components/ui/states";
import { Kpi, Nota, PageHeader, SkillTag } from "@/components/domain/kit";

export default function Page() {
  return <Suspense fallback={<PageLoading />}><Formacao /></Suspense>;
}

function Formacao() {
  const { usuario } = useAuth();
  const meta = useMeta();
  const [f, set] = useFiltrosUrl(["territorioId", "ano", "componenteId"] as const);
  const cat = useQuery({ queryKey: ["formacoes"], queryFn: () => api.get<FormacaoView[]>("/api/formacoes") });
  const dem = useQuery({ queryKey: ["demandas", f], queryFn: () => api.get<Demandas>("/api/formacoes/demandas" + qs(f)) });
  const parts = useQuery({ queryKey: ["participacoes"], queryFn: () => api.get<ParticipacaoView[]>("/api/formacoes/participacoes"), enabled: usuario?.papel !== "PROFESSOR" });
  const [registrar, setRegistrar] = useState<ParticipacaoView | null>(null);

  if (cat.isLoading || meta.isLoading) return <PageLoading />;
  if (cat.error) return <ErrorState error={cat.error} />;
  const forms = cat.data!;
  const totInscr = forms.reduce((a, x) => a + x.inscritos, 0), totConc = forms.reduce((a, x) => a + x.concluidos, 0), totApl = forms.reduce((a, x) => a + x.aplicaram, 0);
  const prof = usuario?.papel === "PROFESSOR";
  const maxDem = Math.max(1, ...(dem.data?.porFormacao ?? []).map(d => d.professoresSemFormacao + d.professoresEmFormacao));

  return (
    <div>
      <PageHeader eyebrow="Dimensão transversal" title="Formação continuada conectada aos diagnósticos"
        description={prof ? "Formações relacionadas às dificuldades que você acompanha nas suas turmas, e registro de como aplicou o que aprendeu."
          : "Demandas de formação identificadas a partir das dificuldades das turmas, oferta disponível e aplicação das estratégias. Formação como apoio profissional, não como avaliação docente."} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Formações no catálogo" value={forms.length} sub={`${forms.filter(x => x.status !== "CONCLUIDA").length} em curso ou com inscrições abertas`} icon={<BookMarked size={16} />} />
        <Kpi label="Participações" value={totInscr} sub={`${totConc} concluídas`} icon={<Users size={16} />} />
        <Kpi label="Aplicaram as estratégias" value={pct(totConc ? (100 * totApl) / totConc : undefined)} sub={`${totApl} de ${totConc} concluintes registraram aplicação`} icon={<CheckCircle2 size={16} />} />
        <Kpi label="Habilidades sem formação no catálogo" value={dem.data?.lacunas.length ?? "—"} sub="necessidades sem oferta correspondente" icon={<AlertCircle size={16} />} tone="atencao" />
      </div>

      {!prof && (
        <Card className="mb-5">
          <CardHeader title="Demandas identificadas" subtitle={`A partir da ${dem.data?.avaliacao ?? "avaliação mais recente"}: professores que atuam em turmas com resultado abaixo do limiar na habilidade`}
            action={<div className="flex flex-wrap gap-2">
              {usuario?.papel === "GESTOR_REDE" && <Select className="h-8 w-auto text-[12.5px]" value={f.territorioId} onChange={e => set({ territorioId: e.target.value })} aria-label="Território"><option value="">Toda a rede</option>{meta.data!.territorios.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</Select>}
              <Select className="h-8 w-auto text-[12.5px]" value={f.componenteId} onChange={e => set({ componenteId: e.target.value })} aria-label="Componente"><option value="">Componentes</option>{meta.data!.componentes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select>
            </div>} />
          {dem.isLoading ? <CardBody><LoadingBlock /></CardBody> : dem.error ? <CardBody><ErrorState error={dem.error} /></CardBody> : (
            <CardBody className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-3 mb-2">Por formação</p>
                <ul className="space-y-3">
                  {dem.data!.porFormacao.map(d => (
                    <li key={d.formacaoId}>
                      <div className="flex justify-between gap-2 text-[13px]"><span className="text-ink">{d.titulo}</span><Badge tone="outline">{FORMACAO_STATUS[d.status]}</Badge></div>
                      <div className="mt-1.5 flex h-3 gap-[2px]" style={{ width: `${Math.max(3, (100 * (d.professoresSemFormacao + d.professoresEmFormacao)) / maxDem)}%` }} role="img" aria-label={`${d.professoresSemFormacao} sem formação, ${d.professoresEmFormacao} cursando`}>
                        {d.professoresSemFormacao > 0 && <div className="rounded-l bg-terracota-500" style={{ flex: d.professoresSemFormacao }} />}
                        {d.professoresEmFormacao > 0 && <div className="rounded-r bg-azulejo-200" style={{ flex: d.professoresEmFormacao }} />}
                      </div>
                      <p className="mt-1 text-[11.5px] text-ink-3"><strong className="text-ink tabular">{d.professoresSemFormacao}</strong> sem formação · {d.professoresEmFormacao} cursando · {d.escolas} escola(s) · {d.territorios} território(s)</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex gap-4 text-[11.5px] text-ink-2"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-terracota-500" />Sem formação</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-azulejo-200" />Cursando</span></p>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-3 mb-2">{usuario?.papel === "GESTOR_REDE" ? "Por território" : "Na escola"}</p>
                <ul className="space-y-2">
                  {(usuario?.papel === "GESTOR_REDE" ? dem.data!.porTerritorio : dem.data!.porEscola).map(r => (
                    <li key={r.id} className="rounded-lg border border-line p-3">
                      <div className="flex justify-between text-[13px]"><strong className="font-medium">{r.nome}</strong><span className="text-ink-3">{r.professoresSemFormacao} prof. sem formação · {r.turmas} turmas</span></div>
                      <div className="mt-1.5 flex flex-wrap gap-1">{r.habilidades.slice(0, 6).map(h => <SkillTag key={h.habilidadeId} id={h.habilidadeId} grupo={h.grupo} />)}</div>
                    </li>
                  ))}
                </ul>
                {dem.data!.lacunas.length > 0 && <div className="mt-3 rounded-lg bg-terracota-50 p-3 text-[12.5px]"><strong>Lacunas no catálogo:</strong> {dem.data!.lacunas.map(l => `${l.habilidadeId} (${l.grupo})`).join(", ")}. Avaliar novos percursos formativos.</div>}
              </div>
            </CardBody>
          )}
          <div className="px-5 pb-4"><Nota>{dem.data?.nota ?? ""}</Nota></div>
        </Card>
      )}

      <h2 className="text-lg font-semibold mb-3">Catálogo demonstrativo</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {forms.map(fo => <FormacaoCard key={fo.id} f={fo} prof={prof} onRegistrar={setRegistrar} />)}
      </div>

      {!prof && parts.data && (
        <Card className="mt-6">
          <CardHeader title="Participações e aplicação das estratégias" subtitle="Registro feito pelo próprio professor após a formação" />
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-canvas"><tr className="text-left text-[11.5px] uppercase tracking-wide text-ink-3"><th className="px-5 py-2">Professor(a)</th><th className="px-3 py-2">Escola</th><th className="px-3 py-2">Formação</th><th className="px-3 py-2">Situação</th><th className="px-5 py-2">Aplicação</th></tr></thead>
              <tbody>{parts.data.map(p => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-5 py-2">{p.professorNome}</td><td className="px-3 py-2 text-ink-2">{p.escolaNome}</td><td className="px-3 py-2 text-ink-2">{p.formacaoTitulo}</td>
                  <td className="px-3 py-2"><Badge tone={p.status === "CONCLUIDO" ? "green" : "blue"}>{p.status === "CONCLUIDO" ? "Concluída" : "Inscrito(a)"}</Badge></td>
                  <td className="px-5 py-2 text-[12.5px] text-ink-2">{p.aplicouEstrategia === true ? p.registroAplicacao ?? "Aplicou" : p.aplicouEstrategia === false ? "Ainda não aplicou" : "—"}</td>
                </tr>))}</tbody>
            </table>
          </div>
        </Card>
      )}
      <RegistroAplicacao part={registrar} onClose={() => setRegistrar(null)} />
    </div>
  );
}

function FormacaoCard({ f, prof, onRegistrar }: { f: FormacaoView; prof: boolean; onRegistrar: (p: ParticipacaoView) => void }) {
  const qc = useQueryClient();
  const insc = useMutation({ mutationFn: () => api.post<ParticipacaoView>(`/api/formacoes/${f.id}/inscricoes`), onSuccess: () => qc.invalidateQueries({ queryKey: ["formacoes"] }) });
  const tone = f.status === "CONCLUIDA" ? "neutral" : f.status === "EM_CURSO" ? "blue" : "green";
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <Badge tone={tone}>{FORMACAO_STATUS[f.status]}</Badge><Badge tone="outline">{MODALIDADE[f.modalidade] ?? f.modalidade}</Badge>
        {prof && f.recomendadaParaMim && <Badge tone="terracota"><Sparkles size={11} />Relacionada às suas turmas</Badge>}
      </div>
      <h3 className="font-semibold text-[15px] leading-snug">{f.titulo}</h3>
      <p className="mt-1 text-[13px] text-ink-2 leading-relaxed">{f.descricao}</p>
      <div className="mt-3 flex flex-wrap gap-1">{f.habilidades.map(h => <SkillTag key={h.id} id={h.id} />)}</div>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-[12.5px] text-ink-2">
        <dt className="flex items-center gap-1 text-ink-3"><Clock size={12} />Carga</dt><dd className="text-right">{f.cargaHoraria} h</dd>
        <dt className="flex items-center gap-1 text-ink-3"><CalendarDays size={12} />Período</dt><dd className="text-right">{dataBR(f.dataInicio)} – {dataBR(f.dataFim)}</dd>
        <dt className="flex items-center gap-1 text-ink-3"><Users size={12} />Participações</dt><dd className="text-right">{f.inscritos}/{f.vagas} vagas · {f.concluidos} concl.</dd>
        <dt className="flex items-center gap-1 text-ink-3"><GraduationCap size={12} />Demanda</dt><dd className="text-right">{f.professoresComDemanda} prof. · {f.escolasComDemanda} escolas</dd>
      </dl>
      <p className="mt-2 text-[12px] text-ink-3">Público: {f.publico}</p>
      <div className="mt-auto pt-4">
        {prof && (f.minhaParticipacao ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-[12.5px]">
            <span>{f.minhaParticipacao.status === "CONCLUIDO" ? (f.minhaParticipacao.aplicouEstrategia ? "Concluída · aplicação registrada" : "Concluída") : "Você está inscrito(a)"}</span>
            <Button size="sm" variant="secondary" onClick={() => onRegistrar(f.minhaParticipacao!)}>Registrar</Button>
          </div>
        ) : f.status !== "CONCLUIDA" ? <Button size="sm" className="w-full" disabled={insc.isPending} onClick={() => insc.mutate()}>Inscrever-me</Button> : null)}
        {insc.error && <p className="mt-2 text-xs text-atencao">{(insc.error as Error).message}</p>}
      </div>
    </Card>
  );
}

function RegistroAplicacao({ part, onClose }: { part: ParticipacaoView | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>(part?.status ?? "INSCRITO");
  const [aplicou, setAplicou] = useState<string>(part?.aplicouEstrategia === undefined || part?.aplicouEstrategia === null ? "" : String(part.aplicouEstrategia));
  const [texto, setTexto] = useState(part?.registroAplicacao ?? "");
  const m = useMutation({
    mutationFn: () => api.patch(`/api/formacoes/participacoes/${part!.id}`, { status, aplicouEstrategia: status === "CONCLUIDO" && aplicou !== "" ? aplicou === "true" : null, registroAplicacao: texto || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["formacoes"] }); onClose(); },
  });
  if (!part) return null;
  return (
    <Dialog open={!!part} onOpenChange={o => !o && onClose()} title="Participação na formação" description={part.formacaoTitulo}>
      <div className="space-y-3">
        <Field label="Situação"><Select value={status} onChange={e => setStatus(e.target.value)}><option value="INSCRITO">Inscrito(a)</option><option value="CONCLUIDO">Concluída</option></Select></Field>
        {status === "CONCLUIDO" && <Field label="Aplicou as estratégias com as turmas?"><Select value={aplicou} onChange={e => setAplicou(e.target.value)}><option value="">Ainda não informado</option><option value="true">Sim</option><option value="false">Ainda não</option></Select></Field>}
        <Field label="Como aplicou / observações"><Textarea value={texto} maxLength={1000} onChange={e => setTexto(e.target.value)} /></Field>
      </div>
      {m.error && <p className="mt-2 text-sm text-atencao">{(m.error as Error).message}</p>}
      <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={m.isPending} onClick={() => m.mutate()}>Salvar</Button></div>
    </Dialog>
  );
}
