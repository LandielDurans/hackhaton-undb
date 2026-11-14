"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Plus, Trash2 } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/queries";
import { COMPONENTE_ROTULO, ESCOPO_ROTULO, dataBR } from "@/lib/format";
import type { DiagnosticoTurma, EscopoPlano, Estrategia, FormacaoView, PlanoDetalhe, PlanoInput, PlanoResumo, Recomendacao } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Nota } from "./kit";
import { REC_STORAGE } from "./recomendacao";

function addDias(iso: string, d: number) {
  const dt = new Date(iso + "T12:00:00");
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
}

const NIVEL_ESCOPO: Record<string, EscopoPlano> = { INDIVIDUAL: "ESTUDANTE", TURMA: "TURMA", ESCOLAR: "ESCOLA", REGIONAL: "TERRITORIO" };

function vazio(escopo: EscopoPlano, hoje: string): PlanoInput {
  return {
    escopo, componenteId: "MAT", titulo: "", problema: "", evidencias: "", objetivo: "", publicoAlvo: "", estrategia: "",
    responsavel: "", dataInicio: addDias(hoje, 2), prazo: addDias(hoje, 30), indicadorAcompanhamento: "", criterioConclusao: "",
    resultadoEsperado: "", habilidades: [], acoes: [],
  };
}

/** Pré-preenche o plano a partir de uma recomendação validada pelo usuário (e da estratégia escolhida). */
function deRecomendacao(r: Recomendacao, estrategiaId: string | undefined, hoje: string, responsavel: string, avBase?: string): PlanoInput {
  const e = r.estrategias.find(x => x.id === estrategiaId) ?? r.estrategias[0];
  const inicio = hoje;
  const semanas = e?.duracaoSemanas ?? 4;
  const prazo = addDias(inicio, semanas * 7 + 7);
  const passos = e?.passos ?? [];
  return {
    escopo: NIVEL_ESCOPO[r.nivel], territorioId: r.alvo.territorioId, escolaId: r.alvo.escolaId, turmaId: r.alvo.turmaId, estudanteId: r.alvo.estudanteId,
    componenteId: r.componenteId,
    titulo: (e ? `${e.titulo.split("(")[0].trim()} — ` : "") + r.titulo.split(" — ").slice(-1)[0].replace(/\s*\(.*?\)\s*$/, "") + ` (${r.habilidades.join(", ")})`,
    problema: r.explicacao.split(" O resultado descreve")[0],
    evidencias: r.evidencias.map(ev => `${ev.rotulo}: ${ev.valor}${ev.detalhe ? ` (${ev.detalhe})` : ""}`).join("; ") + `. Contexto: ${r.contextoTemporal}.`,
    objetivo: e?.objetivo ?? `Desenvolver a habilidade ${r.habilidades.join(", ")}.`,
    publicoAlvo: r.nivel === "ESCOLAR" ? `Estudantes do ${r.anoEscolar}º ano` : r.nivel === "REGIONAL" ? "Coordenações e professores das escolas do território" : "",
    estrategia: e ? `${e.titulo}. ${passos.join(" ")}` : r.acaoSugerida, estrategiaId: e?.id,
    formacaoId: r.formacoes[0]?.id, responsavel, dataInicio: inicio, prazo,
    indicadorAcompanhamento: e?.comoAcompanhar ?? "Registros de acompanhamento e resultado na próxima avaliação comparável.",
    criterioConclusao: `Atividades previstas concluídas e reavaliação aplicada (${e?.quandoReavaliar ?? "ao fim do período"}).`,
    resultadoEsperado: r.nivel === "INDIVIDUAL" ? "Resultado ao menos na faixa “em desenvolvimento” na reavaliação da habilidade." : "Reduzir o número de estudantes com resultado que requer atenção na habilidade.",
    habilidades: r.habilidades, avaliacaoBaseId: avBase, recomendacaoChave: r.chave,
    acoes: passos.slice(0, 4).map((p, i) => ({ descricao: p.length > 300 ? p.slice(0, 297) + "…" : p, responsavel, dataPrevista: addDias(inicio, i * 7) })),
  };
}

export function PlanoForm({ inicial, sp }: { inicial?: PlanoDetalhe; sp?: URLSearchParams }) {
  const { usuario } = useAuth();
  const meta = useMeta();
  const router = useRouter();
  const qc = useQueryClient();
  const hoje = meta.data?.dataReferencia ?? new Date().toISOString().slice(0, 10);
  const edicao = !!inicial;
  const [origemRec, setOrigemRec] = useState<Recomendacao | null>(null);
  const [form, setForm] = useState<PlanoInput | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [completo, setCompleto] = useState<boolean | null>(null);

  // inicialização (edição, recomendação ou parâmetros da URL)
  useEffect(() => {
    if (!meta.data || !usuario || form) return;
    if (inicial) {
      setForm({
        escopo: inicial.escopo, territorioId: inicial.territorio?.id, escolaId: inicial.escola?.id, turmaId: inicial.turma?.id,
        estudanteId: inicial.estudante?.id, planoPaiId: inicial.planoPai?.id ?? null, componenteId: inicial.componenteId,
        titulo: inicial.titulo, problema: inicial.problema, evidencias: inicial.evidencias, objetivo: inicial.objetivo,
        publicoAlvo: inicial.publicoAlvo, estrategia: inicial.estrategia, estrategiaId: inicial.estrategiaId, formacaoId: inicial.formacao?.id,
        responsavel: inicial.responsavel, dataInicio: inicial.dataInicio, prazo: inicial.prazo, indicadorAcompanhamento: inicial.indicadorAcompanhamento,
        criterioConclusao: inicial.criterioConclusao, resultadoEsperado: inicial.resultadoEsperado, habilidades: inicial.habilidades,
        avaliacaoBaseId: inicial.avaliacaoBaseId, versao: inicial.versao,
      });
      return;
    }
    const ultimaAv = meta.data.avaliacoes[meta.data.avaliacoes.length - 1]?.id;
    if (sp?.get("origem") === "recomendacao") {
      try {
        const salvo = JSON.parse(sessionStorage.getItem(REC_STORAGE) ?? "null") as { r: Recomendacao; estrategiaId?: string } | null;
        if (salvo) {
          setOrigemRec(salvo.r);
          setForm(deRecomendacao(salvo.r, salvo.estrategiaId, hoje, usuario.nome, ultimaAv));
          return;
        }
      } catch { /* ignora */ }
    }
    const padrao: EscopoPlano = (sp?.get("escopo") as EscopoPlano) || (usuario.papel === "GESTOR_REDE" ? "TERRITORIO" : usuario.papel === "COORDENADOR" ? "ESCOLA" : "TURMA");
    const base = vazio(padrao, hoje);
    base.responsavel = usuario.nome;
    base.avaliacaoBaseId = ultimaAv;
    base.territorioId = sp?.get("territorioId") ?? (usuario.papel !== "GESTOR_REDE" ? usuario.territorioId : undefined);
    base.escolaId = sp?.get("escolaId") ?? usuario.escolaId;
    base.turmaId = sp?.get("turmaId") ?? undefined;
    base.estudanteId = sp?.get("estudanteId") ?? undefined;
    base.componenteId = sp?.get("componenteId") ?? "MAT";
    if (base.escopo === "TURMA" && !base.turmaId) base.turmaId = meta.data.minhasTurmas[0]?.id;
    setForm(base);
  }, [meta.data, usuario, inicial, sp, form, hoje]);

  const escoposPermitidos: EscopoPlano[] = usuario?.papel === "GESTOR_REDE" ? ["TERRITORIO", "ESCOLA"] : usuario?.papel === "COORDENADOR" ? ["ESCOLA", "TURMA", "ESTUDANTE"] : ["TURMA", "ESTUDANTE"];

  // turma do estudante (quando o escopo é individual, a turma vem do estudante)
  const turmaSel = form?.turmaId;
  const turmaInfo = useQuery({
    queryKey: ["turma-form", turmaSel], enabled: !!turmaSel && (form?.escopo === "ESTUDANTE"),
    queryFn: () => api.get<DiagnosticoTurma>(`/api/turmas/${turmaSel}`),
  });
  const estudanteTurma = useQuery({
    queryKey: ["estudante-turma", form?.estudanteId], enabled: !!form?.estudanteId && !form?.turmaId,
    queryFn: () => api.get<{ estudante: { turmaId: string } }>(`/api/estudantes/${form!.estudanteId}`),
  });
  useEffect(() => {
    if (form && form.escopo === "ESTUDANTE" && !form.turmaId && estudanteTurma.data) setForm({ ...form, turmaId: estudanteTurma.data.estudante.turmaId });
  }, [estudanteTurma.data, form]);

  // público atendido: completa com o nome do estudante ou da turma quando disponível
  useEffect(() => {
    if (!form || form.publicoAlvo) return;
    if (form.escopo === "ESTUDANTE" && form.estudanteId) {
      const est = turmaInfo.data?.estudantes?.find(x => x.id === form.estudanteId);
      if (est) setForm({ ...form, publicoAlvo: `${est.nome} (${turmaInfo.data!.turma.nome})` });
    } else if (form.escopo === "TURMA" && form.turmaId) {
      const t = meta.data?.minhasTurmas.find(x => x.id === form.turmaId);
      if (t) setForm({ ...form, publicoAlvo: `Estudantes do ${t.nome}` });
    }
  }, [form, turmaInfo.data, meta.data]);

  const anoAlvo = useMemo(() => {
    if (!form || !meta.data) return undefined;
    if (form.escopo === "TURMA" || form.escopo === "ESTUDANTE") return meta.data.minhasTurmas.find(t => t.id === form.turmaId)?.anoEscolar
      ?? (form.turmaId ? Number(form.turmaId.split("-")[1]?.[0]) : undefined);
    return undefined;
  }, [form, meta.data]);

  const habilidades = (meta.data?.habilidades ?? []).filter(h => h.componenteId === form?.componenteId && (!anoAlvo || h.anoEscolar === anoAlvo));
  const estrategias = useQuery({ queryKey: ["estrategias"], queryFn: () => api.get<Estrategia[]>("/api/estrategias"), staleTime: Infinity });
  const formacoes = useQuery({ queryKey: ["formacoes"], queryFn: () => api.get<FormacaoView[]>("/api/formacoes") });
  const planosPai = useQuery({ queryKey: ["planos", "pais"], queryFn: () => api.get<PlanoResumo[]>("/api/planos" + qs({})) });
  const estrategiasFiltradas = (estrategias.data ?? []).filter(e => form?.habilidades.some(h => e.habilidades.includes(h)));

  const salvar = useMutation({
    mutationFn: (payload: PlanoInput) => edicao ? api.put<PlanoDetalhe>(`/api/planos/${inicial!.id}`, payload) : api.post<PlanoDetalhe>("/api/planos", payload),
    onSuccess: p => {
      qc.invalidateQueries();
      try { sessionStorage.removeItem(REC_STORAGE); } catch { /* */ }
      router.push(`/planos/${p.id}`);
    },
  });

  if (!form || !meta.data) return <Card className="p-6">Carregando formulário…</Card>;
  const modoCompleto = completo ?? !origemRec;
  const m = meta.data;
  const up = (patch: Partial<PlanoInput>) => setForm({ ...form, ...patch });
  const exigeJust = edicao && inicial!.status !== "PLANEJADO";
  const valido = form.titulo && form.problema && form.evidencias && form.objetivo && form.publicoAlvo && form.estrategia && form.responsavel
    && form.indicadorAcompanhamento && form.criterioConclusao && form.resultadoEsperado && form.habilidades.length > 0 && form.prazo >= form.dataInicio
    && (!exigeJust || justificativa.trim().length >= 5);

  const pendentes = [
    !form.titulo && "título", !form.problema && "problema", !form.evidencias && "evidências", form.habilidades.length === 0 && "habilidades",
    !form.objetivo && "objetivo", !form.publicoAlvo && "público atendido", !form.estrategia && "estratégia", !form.responsavel && "responsável",
    form.prazo < form.dataInicio && "prazo (anterior ao início)", !form.indicadorAcompanhamento && "indicador", !form.criterioConclusao && "critério de conclusão",
    !form.resultadoEsperado && "resultado esperado", exigeJust && justificativa.trim().length < 5 && "justificativa",
  ].filter(Boolean) as string[];
  const enviar = () => salvar.mutate({ ...form, justificativa: exigeJust ? justificativa : undefined, acoes: edicao ? undefined : form.acoes });

  return (
    <form onSubmit={e => { e.preventDefault(); enviar(); }} className="space-y-5">
      {origemRec && (
        <div className="rounded-xl border border-terracota-500/30 bg-terracota-50 p-4 flex gap-3 text-[13.5px]">
          <Lightbulb className="text-terracota-600 shrink-0" size={18} />
          <div>
            <p className="font-medium">Já preenchemos o plano com base na sugestão. Ajuste o que quiser e salve.</p>
          </div>
        </div>
      )}

      {!modoCompleto && (
        <Card>
          <CardHeader title="Seu plano" subtitle={`${form.publicoAlvo || "Plano"} · ${form.habilidades.join(", ")}`} />
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Field label="Título" required className="md:col-span-2"><Input value={form.titulo} maxLength={200} onChange={e => up({ titulo: e.target.value })} /></Field>
            <Field label="O que vou fazer" required className="md:col-span-2"><Textarea value={form.estrategia} maxLength={2000} onChange={e => up({ estrategia: e.target.value })} className="min-h-[110px]" /></Field>
            <Field label="Começa em" required><Input type="date" value={form.dataInicio} onChange={e => up({ dataInicio: e.target.value })} /></Field>
            <Field label="Termina em" required><Input type="date" min={form.dataInicio} value={form.prazo} onChange={e => up({ prazo: e.target.value })} /></Field>
            <Field label="Como vou acompanhar" required className="md:col-span-2"><Textarea value={form.indicadorAcompanhamento} maxLength={600} onChange={e => up({ indicadorAcompanhamento: e.target.value })} className="min-h-[64px]" /></Field>
            <p className="md:col-span-2 text-[12.5px] text-ink-3">Problema, evidências, objetivo, critérios e {form.acoes?.length ?? 0} ações já vieram preenchidos pela sugestão.{" "}
              <button type="button" onClick={() => setCompleto(true)} className="font-medium text-azulejo-700 hover:underline">Ver e editar todos os campos</button></p>
          </CardBody>
        </Card>
      )}

      {modoCompleto && <>
      <Card>
        <CardHeader title="1. Escopo e problema identificado" subtitle="Diagnóstico → priorização → plano" />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="Escopo do plano" required>
            <Select value={form.escopo} disabled={edicao || !!origemRec} onChange={e => up({ escopo: e.target.value as EscopoPlano, habilidades: [] })}>
              {escoposPermitidos.concat(escoposPermitidos.includes(form.escopo) ? [] : [form.escopo]).map(e => <option key={e} value={e}>{ESCOPO_ROTULO[e]}</option>)}
            </Select>
          </Field>
          {form.escopo === "TERRITORIO" && (
            <Field label="Território" required>
              <Select value={form.territorioId ?? ""} disabled={edicao} onChange={e => up({ territorioId: e.target.value })}>
                <option value="">Selecione</option>{m.territorios.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </Select>
            </Field>
          )}
          {form.escopo === "ESCOLA" && (
            <Field label="Escola" required>
              <Select value={form.escolaId ?? ""} disabled={edicao || usuario?.papel !== "GESTOR_REDE"} onChange={e => up({ escolaId: e.target.value })}>
                <option value="">Selecione</option>{m.escolas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </Select>
            </Field>
          )}
          {(form.escopo === "TURMA" || form.escopo === "ESTUDANTE") && (
            <Field label="Turma" required>
              <Select value={form.turmaId ?? ""} disabled={edicao || !!origemRec} onChange={e => up({ turmaId: e.target.value, estudanteId: undefined, habilidades: [] })}>
                <option value="">Selecione</option>
                {m.minhasTurmas.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.id.split("-")[0]})</option>)}
                {form.turmaId && !m.minhasTurmas.some(t => t.id === form.turmaId) && <option value={form.turmaId}>{form.turmaId}</option>}
              </Select>
            </Field>
          )}
          {form.escopo === "ESTUDANTE" && (
            <Field label="Estudante" required>
              <Select value={form.estudanteId ?? ""} disabled={edicao || !!origemRec} onChange={e => up({ estudanteId: e.target.value })}>
                <option value="">{turmaInfo.isLoading ? "Carregando…" : "Selecione"}</option>
                {(turmaInfo.data?.estudantes ?? []).map(s => <option key={s.id} value={s.id}>{s.nome} · {s.codigo}</option>)}
                {form.estudanteId && !turmaInfo.data?.estudantes?.some(s => s.id === form.estudanteId) && <option value={form.estudanteId}>{inicial?.estudante?.nome ?? form.estudanteId}</option>}
              </Select>
            </Field>
          )}
          <Field label="Componente curricular" required>
            <Select value={form.componenteId} disabled={edicao} onChange={e => up({ componenteId: e.target.value, habilidades: [] })}>
              {m.componentes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Field>
          <Field label="Vincular a um plano mais amplo (opcional)" hint="Mostra como prioridades da gestão se traduzem em ações na escola e na sala de aula.">
            <Select value={form.planoPaiId ?? ""} onChange={e => up({ planoPaiId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Nenhum</option>
              {(planosPai.data ?? []).filter(p => p.status !== "REAVALIADO" && p.id !== inicial?.id && p.escopo !== "ESTUDANTE").map(p => <option key={p.id} value={p.id}>[{ESCOPO_ROTULO[p.escopo]}] {p.titulo}</option>)}
            </Select>
          </Field>
          <Field label="Título" required className="md:col-span-2"><Input value={form.titulo} maxLength={200} onChange={e => up({ titulo: e.target.value })} /></Field>
          <Field label="Problema identificado" required className="md:col-span-2"><Textarea value={form.problema} maxLength={1500} onChange={e => up({ problema: e.target.value })} /></Field>
          <Field label="Evidências que justificam o plano" required className="md:col-span-2" hint="Resultados observados. Hipóteses sobre causas devem ser descritas como hipóteses.">
            <Textarea value={form.evidencias} maxLength={2000} onChange={e => up({ evidencias: e.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <p className="text-[13px] font-medium text-ink-2 mb-1.5">Habilidades <span className="text-atencao">*</span> <span className="font-normal text-ink-3">({COMPONENTE_ROTULO[form.componenteId]}{anoAlvo ? `, ${anoAlvo}º ano` : ""})</span></p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {habilidades.map(h => (
                <label key={h.id} className="flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-[12.5px] hover:bg-canvas cursor-pointer">
                  <input type="checkbox" className="mt-0.5 accent-azulejo-700" checked={form.habilidades.includes(h.id)} disabled={edicao && false}
                    onChange={e => up({ habilidades: e.target.checked ? [...form.habilidades, h.id] : form.habilidades.filter(x => x !== h.id) })} />
                  <span><strong className="font-mono">{h.id}</strong> · {h.grupo} <span className="text-ink-3">({h.anoEscolar}º ano)</span></span>
                </label>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="2. Objetivo e estratégia" />
        <CardBody className="grid gap-4 md:grid-cols-2">
          <Field label="Objetivo pedagógico" required className="md:col-span-2"><Textarea value={form.objetivo} maxLength={1000} onChange={e => up({ objetivo: e.target.value })} /></Field>
          <Field label="Público atendido" required><Input value={form.publicoAlvo} maxLength={300} placeholder="Ex.: estudantes do 5º ano A" onChange={e => up({ publicoAlvo: e.target.value })} /></Field>
          <Field label="Estratégia do catálogo (opcional)">
            <Select value={form.estrategiaId ?? ""} onChange={e => {
              const est = estrategias.data?.find(x => x.id === e.target.value);
              up({ estrategiaId: e.target.value || undefined, ...(est && !form.estrategia ? { estrategia: `${est.titulo}. ${est.passos.join(" ")}` } : {}) });
            }}>
              <option value="">Nenhuma / estratégia própria</option>
              {estrategiasFiltradas.map(e => <option key={e.id} value={e.id}>{e.titulo}</option>)}
            </Select>
          </Field>
          <Field label="Estratégia de intervenção" required className="md:col-span-2"><Textarea value={form.estrategia} maxLength={2000} onChange={e => up({ estrategia: e.target.value })} /></Field>
          <Field label="Formação relacionada (opcional)" className="md:col-span-2">
            <Select value={form.formacaoId ?? ""} onChange={e => up({ formacaoId: e.target.value || undefined })}>
              <option value="">Nenhuma</option>
              {(formacoes.data ?? []).map(f => <option key={f.id} value={f.id}>{f.titulo}</option>)}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="3. Responsável, prazos e acompanhamento" />
        <CardBody className="grid gap-4 md:grid-cols-3">
          <Field label="Responsável" required><Input value={form.responsavel} maxLength={160} onChange={e => up({ responsavel: e.target.value })} /></Field>
          <Field label="Data de início" required><Input type="date" value={form.dataInicio} onChange={e => up({ dataInicio: e.target.value })} /></Field>
          <Field label="Prazo de execução" required><Input type="date" min={form.dataInicio} value={form.prazo} onChange={e => up({ prazo: e.target.value })} /></Field>
          <Field label="Indicador de acompanhamento" required className="md:col-span-3"><Textarea value={form.indicadorAcompanhamento} maxLength={600} onChange={e => up({ indicadorAcompanhamento: e.target.value })} /></Field>
          <Field label="Critério de conclusão" required className="md:col-span-3 lg:col-span-1"><Textarea value={form.criterioConclusao} maxLength={600} onChange={e => up({ criterioConclusao: e.target.value })} /></Field>
          <Field label="Resultado esperado" required className="md:col-span-3 lg:col-span-1"><Textarea value={form.resultadoEsperado} maxLength={600} onChange={e => up({ resultadoEsperado: e.target.value })} /></Field>
          <Field label="Avaliação de referência (linha de base)" className="md:col-span-3 lg:col-span-1">
            <Select value={form.avaliacaoBaseId ?? ""} onChange={e => up({ avaliacaoBaseId: e.target.value || undefined })}>
              <option value="">Automática (última antes do início)</option>
              {m.avaliacoes.map(a => <option key={a.id} value={a.id}>{a.sigla} · {dataBR(a.data)}</option>)}
            </Select>
          </Field>
        </CardBody>
      </Card>

      {!edicao && (
        <Card>
          <CardHeader title="4. Ações previstas" subtitle="Atividades com responsável e data. Podem ser ajustadas durante a execução." />
          <CardBody className="space-y-2">
            {(form.acoes ?? []).map((a, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr_200px_160px_auto] items-start">
                <Input value={a.descricao} maxLength={600} aria-label="Descrição da ação" onChange={e => { const ac = [...form.acoes!]; ac[i] = { ...a, descricao: e.target.value }; up({ acoes: ac }); }} />
                <Input value={a.responsavel} maxLength={160} aria-label="Responsável" onChange={e => { const ac = [...form.acoes!]; ac[i] = { ...a, responsavel: e.target.value }; up({ acoes: ac }); }} />
                <Input type="date" value={a.dataPrevista} min={form.dataInicio} aria-label="Data prevista" onChange={e => { const ac = [...form.acoes!]; ac[i] = { ...a, dataPrevista: e.target.value }; up({ acoes: ac }); }} />
                <Button variant="ghost" size="sm" aria-label="Remover ação" onClick={() => up({ acoes: form.acoes!.filter((_, j) => j !== i) })}><Trash2 size={15} /></Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => up({ acoes: [...(form.acoes ?? []), { descricao: "", responsavel: form.responsavel, dataPrevista: form.dataInicio }] })}><Plus size={14} />Adicionar ação</Button>
          </CardBody>
        </Card>
      )}

      </>}

      {exigeJust && (
        <Card className="border-desenvolvimento/40">
          <CardBody className="pt-5">
            <Field label="Justificativa da alteração" required hint="O plano já está em execução: a alteração fica registrada no histórico com esta justificativa.">
              <Textarea value={justificativa} maxLength={1000} onChange={e => setJustificativa(e.target.value)} />
            </Field>
          </CardBody>
        </Card>
      )}

      {salvar.error && <p className="rounded-lg bg-atencao-bg border border-atencao/30 px-4 py-3 text-sm text-atencao" role="alert">{(salvar.error as Error).message}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {pendentes.length > 0
          ? <p className="mr-auto text-[12.5px] text-desenvolvimento-ink" role="status">Preencha: {pendentes.join(", ")}.</p>
          : <Nota className="mr-auto">Campos com * são obrigatórios. O plano começa como “Planejado”.</Nota>}
        <Button variant="secondary" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={!valido || salvar.isPending}>{salvar.isPending ? "Salvando…" : edicao ? "Salvar alterações" : "Criar plano"}</Button>
      </div>
    </form>
  );
}
