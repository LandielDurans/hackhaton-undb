"use client";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "@/lib/api";
import { useMeta } from "@/lib/queries";
import { useFiltrosUrl } from "@/lib/filtros";
import { COMPONENTE_ROTULO, FORMACAO_STATUS } from "@/lib/format";
import type { Curriculo } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import { ErrorState, PageLoading } from "@/components/ui/states";
import { Nota, PageHeader } from "@/components/domain/kit";

export default function Page() {
  return <Suspense fallback={<PageLoading />}><Cur /></Suspense>;
}
function Cur() {
  const meta = useMeta();
  const [f, set] = useFiltrosUrl(["ano", "componenteId"] as const);
  const q = useQuery({ queryKey: ["curriculo", f], queryFn: () => api.get<Curriculo>("/api/curriculo" + qs(f)) });
  if (q.isLoading || meta.isLoading) return <PageLoading />;
  if (q.error) return <ErrorState error={q.error} />;
  const d = q.data!;
  return (
    <div>
      <PageHeader eyebrow="Referência" title="Matriz curricular e de avaliação"
        description="Ano escolar → componente → habilidade (BNCC) → evidência de avaliação (descritor) → apoio disponível. O vínculo entre descritor e habilidade é explícito e tem status de validação." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select className="h-9 w-auto text-[13px]" value={f.ano} onChange={e => set({ ano: e.target.value })} aria-label="Ano"><option value="">Todos os anos</option>{meta.data!.anos.map(a => <option key={a} value={a}>{a}º ano</option>)}</Select>
        <Select className="h-9 w-auto text-[13px]" value={f.componenteId} onChange={e => set({ componenteId: e.target.value })} aria-label="Componente"><option value="">Todos os componentes</option>{meta.data!.componentes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-canvas/70 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
                <th className="px-4 py-2.5">Ano / componente</th><th className="px-3 py-2.5 min-w-[320px]">Habilidade</th><th className="px-3 py-2.5 min-w-[240px]">Descritor da avaliação (mapeamento)</th>
                <th className="px-3 py-2.5">Estratégias</th><th className="px-4 py-2.5">Formações</th>
              </tr>
            </thead>
            <tbody>
              {d.habilidades.map(h => (
                <tr key={h.habilidade.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{h.habilidade.anoEscolar}º ano<span className="block text-xs text-ink-3">{COMPONENTE_ROTULO[h.habilidade.componenteId]}</span></td>
                  <td className="px-3 py-3"><p><strong className="font-mono">{h.habilidade.id}</strong> <span className="text-xs text-ink-3">· {h.habilidade.grupo} · {h.habilidade.unidadeTematica} · BNCC: {h.habilidade.anosBncc}</span></p><p className="mt-1 text-ink-2 leading-snug">{h.habilidade.descricao}</p></td>
                  <td className="px-3 py-3">{h.descritores.map(ds => <div key={ds.id}><p><span className="font-mono text-ink-3">{ds.id}</span> {ds.descricao}</p><Badge tone={ds.statusValidacao === "VALIDADO" ? "green" : "amber"} className="mt-1">{ds.statusValidacao === "VALIDADO" ? "Validado" : "Mapeamento demonstrativo — requer validação"}</Badge></div>)}</td>
                  <td className="px-3 py-3 text-[12.5px] text-ink-2">{h.estrategias.map(e => <p key={e.id}>{e.titulo}</p>)}</td>
                  <td className="px-4 py-3 text-[12.5px] text-ink-2">{h.formacoes.map(fo => <p key={fo.id}>{fo.titulo} <span className="text-ink-3">({FORMACAO_STATUS[fo.status]})</span></p>)}{h.formacoes.length === 0 && <span className="text-terracota-600">sem formação</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-4 space-y-1"><Nota>{d.fonte}</Nota><Nota>{d.aviso}</Nota></div>
    </div>
  );
}
