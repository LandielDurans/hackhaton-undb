"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardList, RefreshCw, Wrench } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/queries";
import { useFiltrosUrl } from "@/lib/filtros";
import { DECISAO_ROTULO, ESCOPO_ROTULO, STATUS_ROTULO, cn, dataBR, pct, pp } from "@/lib/format";
import type { Acompanhamento, Decisao, EscopoPlano, StatusPlano } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { ErrorState, PageLoading } from "@/components/ui/states";
import { Kpi, Nota, PageHeader } from "@/components/domain/kit";
import { EscopoBadge, StatusBadge } from "@/components/domain/badges";
import { PlanoLista } from "@/components/domain/planos";

const STATUS: StatusPlano[] = ["PLANEJADO", "EM_ANDAMENTO", "CONCLUIDO", "REAVALIADO"];
const ESCOPOS: EscopoPlano[] = ["TERRITORIO", "ESCOLA", "TURMA", "ESTUDANTE"];

export default function Page() {
  return <Suspense fallback={<PageLoading />}><Acomp /></Suspense>;
}

function Acomp() {
  const { usuario } = useAuth();
  const meta = useMeta();
  const [f, set] = useFiltrosUrl(["territorioId"] as const);
  const q = useQuery({ queryKey: ["acompanhamento", f.territorioId], queryFn: () => api.get<Acompanhamento>("/api/acompanhamento" + qs({ territorioId: f.territorioId })) });
  if (q.isLoading || meta.isLoading) return <PageLoading />;
  if (q.error) return <ErrorState error={q.error} />;
  const d = q.data!;
  const max = Math.max(1, ...ESCOPOS.map(e => STATUS.reduce((a, s) => a + d.contagem[e][s], 0)));
  const cores: Record<StatusPlano, string> = { PLANEJADO: "#b7d3f6", EM_ANDAMENTO: "#3987e5", CONCLUIDO: "#1c5cab", REAVALIADO: "#0d366b" };
  const icDec: Record<Decisao, React.ReactNode> = { FUNCIONOU: <CheckCircle2 size={16} className="text-adequado" />, AJUSTAR: <Wrench size={16} className="text-desenvolvimento" />, SUBSTITUIR: <RefreshCw size={16} className="text-atencao" /> };

  return (
    <div>
      <PageHeader eyebrow="Acompanhar" title="Execução das ações e resultados observados"
        description={usuario?.papel === "GESTOR_REDE" ? "A SEMED acompanha a execução dos planos e as necessidades de apoio sem acessar dados individuais: planos individuais aparecem apenas como contagens." : "Acompanhamento dos planos da escola e do território."}
        actions={usuario?.papel === "GESTOR_REDE" ? (
          <Select className="h-9 w-auto text-[13px]" value={f.territorioId} onChange={e => set({ territorioId: e.target.value })} aria-label="Território">
            <option value="">Toda a rede</option>{meta.data!.territorios.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Select>) : undefined} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
        <Kpi label="Planos registrados" value={d.total} icon={<ClipboardList size={16} />} />
        <Kpi label="Ativos" value={d.ativos} sub="planejados ou em andamento" />
        <Kpi label="Com prazo vencido" value={d.atrasados} tone="atencao" icon={<AlertTriangle size={16} />} sub="entre os planos visíveis ao seu perfil" />
        <Kpi label="Reavaliados" value={Object.values(d.decisoes).reduce((a, b) => a + b, 0)} sub={`${d.decisoes.FUNCIONOU} funcionaram · ${d.decisoes.AJUSTAR} ajustar · ${d.decisoes.SUBSTITUIR} substituir`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2 mb-5">
        <Card>
          <CardHeader title="Planos por escopo e situação" subtitle="Contagem agregada" />
          <CardBody className="space-y-3">
            {ESCOPOS.map(e => {
              const tot = STATUS.reduce((a, s) => a + d.contagem[e][s], 0);
              return (
                <div key={e}>
                  <div className="flex justify-between text-[13px] mb-1"><span className="text-ink-2">{ESCOPO_ROTULO[e]}</span><strong className="tabular">{tot}</strong></div>
                  <div className="flex h-4 gap-[2px]" style={{ width: `${Math.max(4, (100 * tot) / max)}%` }} role="img"
                    aria-label={`${ESCOPO_ROTULO[e]}: ` + STATUS.map(s => `${STATUS_ROTULO[s]} ${d.contagem[e][s]}`).join(", ")}>
                    {STATUS.filter(s => d.contagem[e][s] > 0).map(s => <div key={s} className="first:rounded-l last:rounded-r" style={{ flex: d.contagem[e][s], background: cores[s] }} title={`${STATUS_ROTULO[s]}: ${d.contagem[e][s]}`} />)}
                  </div>
                </div>
              );
            })}
            <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-ink-2">{STATUS.map(s => <li key={s} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: cores[s] }} />{STATUS_ROTULO[s]}</li>)}</ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Planos com prazo vencido" subtitle="Ainda planejados ou em andamento após o prazo" />
          <div className="border-t border-line max-h-[320px] overflow-y-auto"><PlanoLista planos={d.listaAtrasados} vazio="Nenhum plano com prazo vencido" compacta /></div>
        </Card>
      </div>

      <Card>
        <CardHeader title="O que mudou depois? Resultados dos planos concluídos e reavaliados" subtitle="Percentual de acerto nas habilidades do plano: linha de base × primeira avaliação comparável após o prazo" />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-y border-line bg-canvas/70 text-left text-[11.5px] uppercase tracking-wide text-ink-3">
                <th className="px-5 py-2.5 font-semibold">Plano</th><th className="px-3 py-2.5 font-semibold">Situação</th>
                <th className="px-3 py-2.5 font-semibold text-right">Antes</th><th className="px-3 py-2.5 font-semibold text-right">Depois</th>
                <th className="px-3 py-2.5 font-semibold text-right">Variação</th><th className="px-5 py-2.5 font-semibold">Decisão registrada</th>
              </tr>
            </thead>
            <tbody>
              {d.resultados.map(r => (
                <tr key={r.plano.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5"><Link href={`/planos/${r.plano.id}`} className="font-medium hover:text-azulejo-700 hover:underline">{r.plano.titulo}</Link>
                    <span className="flex items-center gap-1.5 mt-0.5 text-xs text-ink-3"><EscopoBadge escopo={r.plano.escopo} />{r.plano.escola?.nome ?? r.plano.territorio?.nome} · prazo {dataBR(r.plano.prazo)}</span></td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.plano.status} /></td>
                  <td className="px-3 py-2.5 text-right tabular">{pct(r.antes)}<span className="block text-[11px] text-ink-3">{r.avaliacaoBase}</span></td>
                  <td className="px-3 py-2.5 text-right tabular">{r.aguardandoAvaliacao ? <span className="text-xs text-ink-3">aguardando</span> : <>{pct(r.depois)}<span className="block text-[11px] text-ink-3">{r.avaliacaoPosterior}</span></>}</td>
                  <td className={cn("px-3 py-2.5 text-right tabular font-semibold", (r.variacao ?? 0) > 0 ? "text-melhora" : (r.variacao ?? 0) < 0 ? "text-queda" : "")}>{pp(r.variacao)}</td>
                  <td className="px-5 py-2.5">{r.plano.decisaoReavaliacao ? <span className="inline-flex items-center gap-1.5">{icDec[r.plano.decisaoReavaliacao]}{DECISAO_ROTULO[r.plano.decisaoReavaliacao]}</span> : <span className="text-xs text-ink-3">aguardando reavaliação</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-line"><Nota>{d.aviso}</Nota></div>
      </Card>
    </div>
  );
}
