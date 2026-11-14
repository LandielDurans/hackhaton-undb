"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, School, Search, Users, AlertTriangle, GraduationCap } from "lucide-react";
import { api } from "@/lib/api";
import { useMeta } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import type { PainelEscolas } from "@/lib/types";
import { ErrorState, PageLoading } from "@/components/ui/states";
import { cn } from "@/lib/format";

export default function EscolasIndicePage() {
  const { usuario } = useAuth();
  const meta = useMeta();
  const painel = useQuery({
    queryKey: ["painel-escolas-all"],
    queryFn: () => api.get<PainelEscolas>("/api/rede/escolas"),
  });

  const [busca, setBusca] = useState("");
  const [territorio, setTerritorio] = useState("");

  const escolasFiltradas = useMemo(() => {
    const lista = painel.data?.escolas ?? [];
    return lista
      .filter(e => {
        if (territorio && e.territorioId !== territorio) return false;
        if (busca.trim()) {
          const q = busca.toLowerCase();
          return (
            e.nome.toLowerCase().includes(q) ||
            e.bairro.toLowerCase().includes(q) ||
            e.territorioNome.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [painel.data, busca, territorio]);

  if (meta.isLoading || painel.isLoading || !usuario) return <PageLoading />;
  if (meta.error) return <ErrorState error={meta.error} />;
  if (painel.error) return <ErrorState error={painel.error} onRetry={() => painel.refetch()} />;

  const territorios = meta.data?.territorios ?? [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-azulejo-700">
            Visão Unidade Escolar
          </p>
          <h1 className="text-2xl font-bold text-ink mt-1">Análise por Escola</h1>
          <p className="text-sm text-ink-2 mt-1">
            Consulte médias dos alunos, frequência, quadro docente e planos pedagógicos das{" "}
            <strong className="font-semibold text-ink">{painel.data?.escolas.length ?? 256} unidades</strong> da rede municipal.
          </p>
        </div>

        {usuario.escolaId && (
          <Link
            href={`/escolas/${usuario.escolaId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-azulejo-700 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm hover:bg-azulejo-600"
          >
            <School size={16} />
            Abrir minha escola ({usuario.escolaNome || usuario.escolaId})
            <ArrowRight size={15} />
          </Link>
        )}
      </div>

      {/* Filtros de busca e núcleo */}
      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3">
        <div className="sm:col-span-2 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar escola por nome, bairro ou núcleo..."
            className="w-full rounded-xl border border-line bg-canvas pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:border-azulejo-500 focus:outline-none"
          />
        </div>
        <select
          value={territorio}
          onChange={e => setTerritorio(e.target.value)}
          className="rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink focus:border-azulejo-500 focus:outline-none"
          aria-label="Filtrar por núcleo territorial"
        >
          <option value="">Todos os 7 núcleos territoriais</option>
          {territorios.map(t => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Contagem */}
      <div className="text-xs font-medium text-ink-3">
        Exibindo <strong className="text-ink">{escolasFiltradas.length}</strong> escolas
        {territorio ? ` no núcleo selecionado` : " na rede municipal"}
      </div>

      {/* Grid de escolas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {escolasFiltradas.slice(0, 60).map(escola => {
          const taxaEvasao = escola.evasao?.taxa ?? 0;
          const nota = escola.notas?.nota ?? 0;
          const faltamProfs = escola.escassez?.faltam ?? 0;
          const alerta = taxaEvasao >= 12 || faltamProfs >= 3;

          return (
            <Link
              key={escola.id}
              href={`/escolas/${escola.id}`}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 transition-all hover:border-azulejo-500 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-azulejo-50 px-2.5 py-0.5 text-[11px] font-semibold text-azulejo-700">
                    {escola.territorioNome}
                  </span>
                  {alerta && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-atencao-bg px-2 py-0.5 text-[11px] font-semibold text-atencao">
                      <AlertTriangle size={12} />
                      Atenção
                    </span>
                  )}
                </div>

                <h2 className="mt-2.5 font-display text-[15.5px] font-bold text-ink group-hover:text-azulejo-700">
                  {escola.nome}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3">
                  <MapPin size={13} />
                  {escola.bairro} · {escola.etapas || "Ensino Fundamental"}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                <div>
                  <span className="block text-[10.5px] font-medium text-ink-3">Alunos</span>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-sm font-bold text-ink tabular">
                    <Users size={13} className="text-azulejo-700" />
                    {escola.evasao?.matriculados ?? 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[10.5px] font-medium text-ink-3">Média SAEB</span>
                  <span className="mt-0.5 inline-flex items-center gap-1 text-sm font-bold text-ink tabular">
                    <GraduationCap size={13} className="text-azulejo-700" />
                    {nota.toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10.5px] font-medium text-ink-3">Infrequência</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-sm font-bold tabular",
                      taxaEvasao >= 12 ? "text-atencao" : "text-ink"
                    )}
                  >
                    {taxaEvasao.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {escolasFiltradas.length > 60 && (
        <p className="text-center text-xs text-ink-3">
          Mostrando as 60 primeiras escolas. Use a busca acima para localizar uma escola específica.
        </p>
      )}
    </div>
  );
}
