"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/domain/kit";
import { PlanoForm } from "@/components/domain/plano-form";
import { PageLoading } from "@/components/ui/states";

export default function Page() {
  return <Suspense fallback={<PageLoading />}><Novo /></Suspense>;
}
function Novo() {
  const sp = useSearchParams();
  return (
    <div className="max-w-5xl">
      <PageHeader breadcrumb={[{ href: "/planos", label: "Planos de ação" }, { label: "Novo plano" }]} eyebrow="Plano de Ação Pedagógica"
        title="Transformar uma dificuldade observada em ações" description="Defina o problema, as evidências, a estratégia, quem atuará, os prazos e como os resultados serão acompanhados." />
      <PlanoForm sp={new URLSearchParams(sp.toString())} />
    </div>
  );
}
