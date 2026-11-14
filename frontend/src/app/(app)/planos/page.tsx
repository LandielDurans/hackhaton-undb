"use client";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Columns3, List, Plus, Search } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/queries";
import { useFiltrosUrl } from "@/lib/filtros";
import { ESCOPO_ROTULO, STATUS_ROTULO, cn } from "@/lib/format";
import type { EscopoPlano, PlanoResumo, StatusPlano } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { buttonClass } from "@/components/ui/button";
import { ErrorState, PageLoading } from "@/components/ui/states";
import { Nota, PageHeader } from "@/components/domain/kit";
import { PlanoLinha, PlanoLista } from "@/components/domain/planos";

const STATUS: StatusPlano[] = ["PLANEJADO", "EM_ANDAMENTO", "CONCLUIDO", "REAVALIADO"];

export default function Page() {
  return <Suspense fallback={<PageLoading />}><Planos /></Suspense>;
}

function Planos() {
  const { usuario } = useAuth();
  const meta = useMeta();
  const [f, set] = useFiltrosUrl(["escopo", "status", "territorioId", "escolaId", "componenteId", "atrasados", "busca", "visao"] as const);
  const filtro = { escopo: f.escopo, status: f.status, territorioId: f.territorioId, escolaId: f.escolaId, componenteId: f.componenteId, atrasados: f.atrasados };
  const q = useQuery({ queryKey: ["planos", filtro], queryFn: () => api.get<PlanoResumo[]>("/api/planos" + qs(filtro)) });
  const planos = useMemo(() => (q.data ?? []).filter(p => !f.busca || (p.titulo + p.responsavel + (p.estudante?.nome ?? "") + (p.turma?.nome ?? "") + (p.escola?.nome ?? "")).toLowerCase().includes(f.busca.toLowerCase())), [q.data, f.busca]);
  const kanban = f.visao !== "lista";
  if (meta.isLoading) return <PageLoading />;

  return (
    <div>
      <PageHeader title="Planos de ação"
        description="Do problema à ação, e da ação ao resultado."
        actions={<Link href="/planos/novo" className={buttonClass("primary")}><Plus size={15} />Novo plano</Link>} />

      <Card className="mb-5 p-3">
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4 xl:grid-cols-[1.4fr_repeat(5,1fr)_auto]">
          <div className="relative col-span-2 md:col-span-4 xl:col-span-1">
            <Search size={14} className="absolute left-3 top-3 text-ink-3" />
            <Input placeholder="Buscar por título, responsável, turma…" className="h-9 pl-8 text-[13px]" value={f.busca} onChange={e => set({ busca: e.target.value })} aria-label="Buscar planos" />
          </div>
          <Select className="h-9 text-[13px]" value={f.escopo} onChange={e => set({ escopo: e.target.value })} aria-label="Escopo">
            <option value="">Todos os escopos</option>{(["TERRITORIO", "ESCOLA", "TURMA", "ESTUDANTE"] as EscopoPlano[]).map(e => <option key={e} value={e}>{ESCOPO_ROTULO[e]}</option>)}
          </Select>
          <Select className="h-9 text-[13px]" value={f.status} onChange={e => set({ status: e.target.value })} aria-label="Situação">
            <option value="">Todas as situações</option>{STATUS.map(s => <option key={s} value={s}>{STATUS_ROTULO[s]}</option>)}
          </Select>
          {usuario?.papel === "GESTOR_REDE" ? (
            <Select className="h-9 text-[13px]" value={f.territorioId} onChange={e => set({ territorioId: e.target.value })} aria-label="Território">
              <option value="">Todos os territórios</option>{meta.data!.territorios.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Select>
          ) : <div className="hidden xl:block" />}
          {usuario?.papel === "GESTOR_REDE" ? (
            <Select className="h-9 text-[13px]" value={f.escolaId} onChange={e => set({ escolaId: e.target.value })} aria-label="Escola">
              <option value="">Todas as escolas</option>{meta.data!.escolas.filter(e => !f.territorioId || e.territorioId === f.territorioId).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </Select>
          ) : <div className="hidden xl:block" />}
          <Select className="h-9 text-[13px]" value={f.componenteId} onChange={e => set({ componenteId: e.target.value })} aria-label="Componente">
            <option value="">Todos os componentes</option>{meta.data!.componentes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12.5px] text-ink-2 whitespace-nowrap"><input type="checkbox" className="accent-azulejo-700" checked={f.atrasados === "true"} onChange={e => set({ atrasados: e.target.checked ? "true" : "" })} />Prazo vencido</label>
            <div className="inline-flex rounded-lg border border-line p-0.5 ml-auto">
              <button onClick={() => set({ visao: "" })} aria-pressed={kanban} className={cn("rounded-md p-1.5", kanban ? "bg-azulejo-700 text-white" : "text-ink-3")} aria-label="Quadro"><Columns3 size={15} /></button>
              <button onClick={() => set({ visao: "lista" })} aria-pressed={!kanban} className={cn("rounded-md p-1.5", !kanban ? "bg-azulejo-700 text-white" : "text-ink-3")} aria-label="Lista"><List size={15} /></button>
            </div>
          </div>
        </div>
      </Card>

      {q.isLoading ? <PageLoading /> : q.error ? <ErrorState error={q.error} /> : kanban ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUS.map(s => {
            const col = planos.filter(p => p.status === s);
            return (
              <div key={s} className="rounded-[var(--radius-card)] bg-surface border border-line flex flex-col max-h-[75vh]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                  <h2 className="text-sm font-semibold">{STATUS_ROTULO[s]}</h2>
                  <span className="rounded-full bg-canvas px-2 text-xs font-semibold tabular text-ink-2">{col.length}</span>
                </div>
                <div className="overflow-y-auto">{col.length ? col.map(p => <PlanoLinha key={p.id} p={p} compacta />) : <p className="p-4 text-xs text-ink-3">Nenhum plano.</p>}</div>
              </div>
            );
          })}
        </div>
      ) : <Card><PlanoLista planos={planos} /></Card>}
      <Nota className="mt-4">{usuario?.papel === "GESTOR_REDE"
        ? "Planos individuais não são listados para a gestão da rede (dados de estudantes). Eles aparecem apenas como contagens agregadas no mapa e no acompanhamento."
        : "Você vê os planos do seu escopo: território, escola e turmas sob sua responsabilidade."}</Nota>
    </div>
  );
}
