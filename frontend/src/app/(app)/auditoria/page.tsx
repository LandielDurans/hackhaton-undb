"use client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { dataHoraBR } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { ErrorState, PageLoading } from "@/components/ui/states";
import { Nota, PageHeader } from "@/components/domain/kit";

interface Evento { id: number; dataHora: string; usuarioId: string; usuarioNome?: string; papel: string; acao: string; recurso: string; recursoId?: string; permitido: boolean; detalhe?: string }

export default function Page() {
  const q = useQuery({ queryKey: ["auditoria"], queryFn: () => api.get<Evento[]>("/api/auditoria?limite=200"), refetchInterval: 15000 });
  if (q.isLoading) return <PageLoading />;
  if (q.error) return <ErrorState error={q.error} />;
  return (
    <div>
      <PageHeader eyebrow="Segurança e LGPD" title="Auditoria de acessos e alterações"
        description="Acessos a dados individuais, alterações em planos e tentativas negadas são registrados. A trilha contém identificadores, não dados pedagógicos." />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-line bg-canvas/70 text-left text-[11.5px] uppercase tracking-wide text-ink-3"><th className="px-5 py-2.5">Quando</th><th className="px-3 py-2.5">Usuário</th><th className="px-3 py-2.5">Ação</th><th className="px-3 py-2.5">Recurso</th><th className="px-3 py-2.5">Resultado</th><th className="px-5 py-2.5">Detalhe</th></tr></thead>
            <tbody>{q.data!.map(e => (
              <tr key={e.id} className="border-b border-line last:border-0">
                <td className="px-5 py-2 whitespace-nowrap tabular">{dataHoraBR(e.dataHora)}</td>
                <td className="px-3 py-2">{e.usuarioNome ?? e.usuarioId}<span className="block text-[11px] text-ink-3">{e.papel}</span></td>
                <td className="px-3 py-2 font-mono text-[12px]">{e.acao}</td>
                <td className="px-3 py-2">{e.recurso} <span className="font-mono text-ink-3">{e.recursoId}</span></td>
                <td className="px-3 py-2">{e.permitido ? <span className="inline-flex items-center gap-1 text-adequado"><CheckCircle2 size={14} />permitido</span> : <span className="inline-flex items-center gap-1 text-atencao"><ShieldAlert size={14} />negado</span>}</td>
                <td className="px-5 py-2 text-[12px] text-ink-2 max-w-md">{e.detalhe}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </Card>
      <Nota className="mt-3">Exibe os 200 eventos mais recentes. Visível apenas para a gestão da rede.</Nota>
    </div>
  );
}
