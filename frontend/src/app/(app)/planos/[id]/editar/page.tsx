"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PlanoDetalhe } from "@/lib/types";
import { PageHeader } from "@/components/domain/kit";
import { PlanoForm } from "@/components/domain/plano-form";
import { ErrorState, PageLoading, RestrictedNotice } from "@/components/ui/states";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({ queryKey: ["plano", id], queryFn: () => api.get<PlanoDetalhe>(`/api/planos/${id}`) });
  if (q.isLoading) return <PageLoading />;
  if (q.error) return <ErrorState error={q.error} />;
  if (!q.data!.podeEditar) return <RestrictedNotice mensagem="Seu perfil pode visualizar, mas não alterar este plano." />;
  return (
    <div className="max-w-5xl">
      <PageHeader breadcrumb={[{ href: "/planos", label: "Planos de ação" }, { href: `/planos/${id}`, label: q.data!.titulo }, { label: "Editar" }]} title="Revisar plano"
        description="Alterações em planos em execução exigem justificativa e ficam registradas no histórico." />
      <PlanoForm inicial={q.data!} />
    </div>
  );
}
