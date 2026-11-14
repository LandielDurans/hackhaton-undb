"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { COMPONENTE_ROTULO } from "@/lib/format";
import type { MinhaTurma } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, ErrorState, PageLoading } from "@/components/ui/states";
import { DistribuicaoNiveis, PageHeader } from "@/components/domain/kit";
import { ValorIndicador } from "@/components/domain/badges";

export default function TurmasPage() {
  const { usuario } = useAuth();
  const q = useQuery({ queryKey: ["minhas-turmas"], queryFn: () => api.get<MinhaTurma[]>("/api/minhas-turmas") });
  if (q.isLoading) return <PageLoading />;
  if (q.error) return <ErrorState error={q.error} />;
  const prof = usuario?.papel === "PROFESSOR";
  return (
    <div>
      <PageHeader eyebrow={prof ? "Minhas turmas" : "Turmas da escola"} title={prof ? `Olá, ${usuario?.nome.split(" ")[0]}` : usuario?.escolaNome ?? "Turmas"}
        description={prof ? "Suas turmas na última avaliação." : "Turmas da escola na última avaliação."} />
      {q.data!.length === 0 ? <EmptyState title="Nenhuma turma vinculada ao seu perfil" /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {q.data!.map(t => (
            <Card key={t.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{t.nome}</h2>
                  <p className="text-[13px] text-ink-3">{t.escolaNome} · {t.matriculados} estudantes</p>
                </div>
                <span className="rounded-lg bg-azulejo-50 p-2 text-azulejo-700"><Users size={18} /></span>
              </div>
              <div className="mt-4 space-y-3 flex-1">
                {Object.entries(t.indicadores).filter(([c]) => t.componentes.includes(c)).map(([c, ind]) => (
                  <div key={c}>
                    <div className="flex justify-between text-[13px] mb-1"><span className="text-ink-2">{COMPONENTE_ROTULO[c]}</span><span className="font-semibold"><ValorIndicador ind={ind} /></span></div>
                    <DistribuicaoNiveis ind={ind} compacta />
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-ink-2"><strong className="text-atencao tabular">{t.estudantesComAtencao}</strong> estudantes precisam de apoio{t.planosAtivos ? ` · ${t.planosAtivos} plano(s) ativo(s)` : ""}</p>
              <div className="mt-4 flex gap-2">
                <Link href={`/turmas/${t.id}`} className={buttonClass("secondary", "sm", "flex-1")}>Analisar turma<ArrowRight size={14} /></Link>
                <Link href={`/assistente?turma=${t.id}`} className={buttonClass("primary", "sm", "flex-1")}><Sparkles size={14} />O que fazer</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
