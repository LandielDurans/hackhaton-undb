"use client";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, UserRound } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFiltrosUrl } from "@/lib/filtros";
import { cn } from "@/lib/format";
import type { AlunoAssistente, MinhaTurma, Recomendacao } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { EmptyState, ErrorState, LoadingBlock, PageLoading, RestrictedNotice } from "@/components/ui/states";
import { PageHeader, SkillTag } from "@/components/domain/kit";
import { ListaSugestoes } from "@/components/domain/assistente";

export default function Page() {
  return <Suspense fallback={<PageLoading />}><Assistente /></Suspense>;
}

function Assistente() {
  const { usuario } = useAuth();
  const [f, set] = useFiltrosUrl(["turma", "estudante", "componenteId"] as const);
  const turmas = useQuery({ queryKey: ["minhas-turmas"], queryFn: () => api.get<MinhaTurma[]>("/api/minhas-turmas"), enabled: usuario?.papel !== "GESTOR_REDE" });
  const turmaId = f.turma || turmas.data?.[0]?.id || "";
  useEffect(() => { if (!f.turma && turmas.data?.[0]) set({ turma: turmas.data[0].id }); }, [f.turma, turmas.data, set]);
  const alunos = useQuery({
    queryKey: ["assistente", turmaId, f.componenteId], enabled: !!turmaId,
    queryFn: () => api.get<AlunoAssistente[]>(`/api/assistente/turmas/${turmaId}` + qs({ componenteId: f.componenteId })),
  });
  const estudanteId = f.estudante || alunos.data?.[0]?.id || "";
  const recs = useQuery({
    queryKey: ["recomendacoes", "estudante", estudanteId, f.componenteId], enabled: !!estudanteId,
    queryFn: () => api.get<Recomendacao[]>(`/api/recomendacoes/estudantes/${estudanteId}` + qs({ componenteId: f.componenteId })),
  });

  if (usuario?.papel === "GESTOR_REDE") {
    return <RestrictedNotice mensagem="O assistente docente trabalha com dados individuais e é restrito à escola e ao professor responsável. A gestão da rede acompanha as ações por meio de indicadores agregados." />;
  }
  if (turmas.isLoading) return <PageLoading />;
  if (turmas.error) return <ErrorState error={turmas.error} />;
  const aluno = alunos.data?.find(a => a.id === estudanteId);

  return (
    <div>
      <PageHeader title="Assistente docente" description="Escolha um estudante e veja o que trabalhar e como." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={turmaId} onChange={e => set({ turma: e.target.value, estudante: "" })} className="w-auto h-9 text-[13px]" aria-label="Turma">
          {turmas.data!.map(t => <option key={t.id} value={t.id}>{t.nome} · {t.escolaNome}</option>)}
        </Select>
        <Select value={f.componenteId} onChange={e => set({ componenteId: e.target.value })} className="w-auto h-9 text-[13px]" aria-label="Componente">
          <option value="">Todos os componentes</option><option value="MAT">Matemática</option><option value="LP">Língua Portuguesa</option>
        </Select>
      </div>
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="self-start lg:sticky lg:top-20 max-h-[calc(100vh-110px)] overflow-y-auto">
          <p className="px-4 pt-3 pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Estudantes ({alunos.data?.length ?? 0})</p>
          {alunos.isLoading ? <div className="p-4"><LoadingBlock linhas={8} /></div> : alunos.error ? <div className="p-4"><ErrorState error={alunos.error} /></div> : (
            <ul>
              {alunos.data!.map(a => (
                <li key={a.id}>
                  <button onClick={() => set({ estudante: a.id })} aria-current={a.id === estudanteId}
                    className={cn("w-full text-left px-4 py-2.5 border-t border-line flex items-center gap-2.5", a.id === estudanteId ? "bg-azulejo-50" : "hover:bg-canvas")}>
                    <UserRound size={16} className="text-ink-3 shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-medium">{a.nome}</span>
                      <span className="block text-[11.5px] text-ink-3">{a.alta + a.media + a.baixa === 0 ? "tudo certo" : `${a.alta + a.media + a.baixa} ponto(s) a trabalhar`}{a.planosAtivos ? ` · com plano` : ""}</span>
                    </span>
                    {a.alta > 0 && <span className="rounded-full bg-atencao-bg px-1.5 text-[11px] font-semibold text-atencao" title="Prioridade alta">{a.alta}</span>}
                    {a.media > 0 && <span className="rounded-full bg-desenvolvimento-bg px-1.5 text-[11px] font-semibold text-desenvolvimento-ink" title="Prioridade média">{a.media}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div>
          {aluno && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{aluno.nome}</h2>
                <div className="flex flex-wrap gap-1 mt-1">{aluno.habilidades.map(h => <SkillTag key={h} id={h} />)}</div>
              </div>
              <Link href={`/estudantes/${aluno.id}`} className="text-sm font-medium text-azulejo-700 hover:underline inline-flex items-center gap-1">Perfil completo<ArrowRight size={14} /></Link>
            </div>
          )}
          {recs.isLoading ? <LoadingBlock linhas={6} /> : recs.error ? <ErrorState error={recs.error} /> : !recs.data || recs.data.length === 0
            ? <EmptyState icon={<Sparkles size={20} />} title="Sem sugestões para este estudante">Todas as habilidades estão na faixa adequada na última avaliação.</EmptyState>
            : <ListaSugestoes recs={recs.data} podeAgir />}
        </div>
      </div>
    </div>
  );
}
