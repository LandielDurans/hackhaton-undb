"use client";
import { Suspense, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Accessibility, AlertTriangle, BookOpenCheck, ChevronDown, GraduationCap, Info, Map as MapIcon, TrendingDown, UserX, X } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMeta } from "@/lib/queries";
import { useFiltrosUrl } from "@/lib/filtros";
import { ANALISES, COR_FAIXA, faixaAnalise, legendaAnalise, valorAnalise, type Analise } from "@/lib/analises";
import { cn } from "@/lib/format";
import { iconeEscola, PORTE_ROTULO, type Porte } from "@/lib/icones-escola";
import type { EscolaAnalise, Notificacao, PainelEscolas } from "@/lib/types";
import { ErrorState, PageLoading, Skeleton } from "@/components/ui/states";

const MapaIlustrado = dynamic(() => import("@/components/map/mapa-ilustrado"), { ssr: false, loading: () => <Skeleton className="h-[620px] w-full rounded-none" /> });

const ICONE: Record<Analise, typeof UserX> = { evasao: UserX, notas: GraduationCap, materia: BookOpenCheck, escassez: TrendingDown, inclusao: Accessibility };

export default function RedePage() {
  return <Suspense fallback={<PageLoading />}><Rede /></Suspense>;
}

function Rede() {
  const { usuario } = useAuth();
  const meta = useMeta();
  const [f, set] = useFiltrosUrl(["analise", "escola", "ano", "materia", "mapa"] as const);
  const analise = (f.analise || "evasao") as Analise;
  const materia = f.materia || "MAT";
  const painel = useQuery({ queryKey: ["painel-escolas", f.ano], queryFn: () => api.get<PainelEscolas>("/api/rede/escolas" + qs({ ano: f.ano })) });
  const selecionada = painel.data?.escolas.find(e => e.id === f.escola);

  const resumo = useMemo(() => {
    const r = painel.data?.rede ?? {};
    const n = (v?: number | null, suf = "%") => v === undefined || v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${suf}`;
    return {
      evasao: `${n(r.evasao)} na rede`,
      notas: `média ${r.percentualAcerto ? (r.percentualAcerto / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}`,
      materia: materia === "MAT" ? "Matemática" : "Língua Portuguesa",
      escassez: `${n(r.profissionaisFaltando, "")} vagas abertas`,
      inclusao: `${n(r.coberturaAee)} atendidos`,
    } as Record<Analise, string>;
  }, [painel.data, materia]);

  if (meta.isLoading || !usuario) return <PageLoading />;
  if (meta.error) return <ErrorState error={meta.error} />;
  const crit = meta.data!.criterios;

  return (
    <div>
      {/* Cabeçalho com foto real de São Luís (Palácio dos Leões) */}
      <section className="relative mb-4 overflow-hidden rounded-2xl bg-azulejo-900 bg-cover bg-center px-6 py-5 text-white"
        style={{ backgroundImage: "linear-gradient(90deg, rgb(8 28 51 / 0.94) 0%, rgb(13 43 74 / 0.75) 55%, rgb(13 43 74 / 0.2) 100%), url(/fotos/palacio-dos-leoes.jpg)", backgroundPosition: "center 40%" }}>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-sol">NÍVEL 1 · INTELIGÊNCIA REGIONAL</p>
        <h1 className="mt-1 text-[22px] md:text-[28px] font-bold leading-tight">Onde estão os desafios da educação municipal?</h1>
        <p className="mt-1 text-[13px] text-white/80">São Luís · 6 territórios demonstrativos · 18 escolas · dados fictícios</p>
        <div className="faixa-slz-h absolute inset-x-0 bottom-0 h-[4px]" aria-hidden />
      </section>

      {/* Cartões de análise */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" role="tablist" aria-label="Análises do mapa">
        {ANALISES.map(a => {
          const Icon = ICONE[a.id];
          const ativo = analise === a.id;
          return (
            <button key={a.id} role="tab" aria-selected={ativo} onClick={() => set({ analise: a.id })}
              className={cn("group relative overflow-hidden rounded-2xl border-2 px-4 pt-3.5 pb-4 text-left transition-all",
                ativo ? "border-azulejo-700 bg-azulejo-700 text-white shadow-[0_8px_24px_-10px_rgba(13,43,74,0.7)]" : "border-azulejo-900/15 bg-surface hover:border-azulejo-500 hover:-translate-y-0.5")}>
              <span className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-full", ativo ? "bg-white text-azulejo-700" : "bg-azulejo-50 text-azulejo-700")}>
                <Icon size={17} />
              </span>
              <span className="block font-display text-[15px] font-bold leading-snug">{a.titulo}</span>
              <span className={cn("mt-1 block text-[12px]", ativo ? "text-white/75" : "text-ink-3")}>{painel.data ? resumo[a.id] : "…"}</span>
              {ativo && <span className="faixa-slz-h absolute inset-x-0 bottom-0 h-[5px]" aria-hidden />}
            </button>
          );
        })}
      </div>

      {/* Seletores (abaixo das três primeiras análises) */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Seletor rotulo="Selecione a escola" valor={f.escola} onChange={v => set({ escola: v })}
          opcoes={(painel.data?.escolas ?? []).slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(e => [e.id, `${e.nome} · ${e.bairro}`])} />
        <Seletor rotulo="Selecione o ano" valor={f.ano} onChange={v => set({ ano: v })} opcoes={meta.data!.anos.map(a => [String(a), `${a}º ano`])} todos="Todos os anos" />
        <Seletor rotulo="Selecione a matéria" valor={f.materia} onChange={v => set({ materia: v, analise: "materia" })}
          opcoes={meta.data!.componentes.map(c => [c.id, c.nome])} />
      </div>

      {/* Mapa + notificações */}
      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <section className="relative overflow-hidden rounded-2xl border-2 border-azulejo-900/80 bg-surface xl:col-span-4">
          {painel.data ? (
            <MapaIlustrado escolas={painel.data.escolas} analise={analise} materia={materia} criterios={crit} selecionada={f.escola || undefined}
              onSelecionar={id => set({ escola: id })} usuario={usuario} detalhado={f.mapa === "detalhado"} />
          ) : painel.error ? <div className="p-5"><ErrorState error={painel.error} onRetry={() => painel.refetch()} /></div> : <Skeleton className="h-[620px] w-full rounded-none" />}

          {/* Alternância ilustrado / detalhado */}
          <div className="absolute right-3 top-3 z-[500] inline-flex rounded-lg border border-azulejo-900/20 bg-white/95 p-0.5 shadow">
            {[["", "Ilustrado"], ["detalhado", "Ruas"]].map(([v, r]) => (
              <button key={v} onClick={() => set({ mapa: v })} aria-pressed={(f.mapa || "") === v}
                className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium", (f.mapa || "") === v ? "bg-azulejo-700 text-white" : "text-ink-2")}>
                {v === "" && <MapIcon size={13} />}{r}
              </button>
            ))}
          </div>

          {/* Legenda */}
          <div className="absolute bottom-3 left-3 z-[500] rounded-xl border border-azulejo-900/20 bg-white/95 px-3 py-2.5 shadow-[var(--shadow-pop)]">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-azulejo-900">{ANALISES.find(a => a.id === analise)!.curto}{analise === "materia" ? ` · ${materia === "MAT" ? "Matemática" : "Português"}` : ""}</p>
            <ul className="space-y-1 text-[12px] text-ink-2">
              {legendaAnalise(analise, crit).map(([fx, r]) => (
                <li key={fx} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: COR_FAIXA[fx], boxShadow: `0 0 8px 2px ${COR_FAIXA[fx]}66` }} />{r}</li>
              ))}
            </ul>
            <p className="mt-2 mb-0.5 border-t border-line pt-1.5 text-[11px] font-bold uppercase tracking-wider text-azulejo-900">Porte</p>
            <ul className="flex items-end gap-3 text-[11px] text-ink-2">
              {([["PEQUENA", "< 200"], ["MEDIA", "200–1 mil"], ["GRANDE", "> 1 mil"]] as [Porte, string][]).map(([p, r]) => (
                <li key={p} className="flex flex-col items-center gap-0.5" title={PORTE_ROTULO[p]}>
                  <span className="flex h-7 items-end" dangerouslySetInnerHTML={{ __html: iconeEscola(p, "#7d8db3").html.replace(/width="[\d.]+" height="[\d.]+"/, 'height="26"') }} />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {selecionada && <CartaoEscola e={selecionada} analise={analise} materia={materia} crit={crit} podeAbrir={usuario.papel === "GESTOR_REDE" || usuario.escolaId === selecionada.id} onFechar={() => set({ escola: "" })} />}
        </section>

        <Notificacoes lista={painel.data?.notificacoes} carregando={painel.isLoading} onSelecionar={id => set({ escola: id })} selecionada={f.escola} />
      </div>

      {painel.data && (
        <details className="mt-3 text-[12px] text-ink-3">
          <summary className="cursor-pointer inline-flex items-center gap-1.5"><Info size={13} />Sobre estes dados</summary>
          <p className="mt-1.5 max-w-4xl leading-relaxed">{painel.data.aviso} Desempenho na {painel.data.avaliacao} ({painel.data.avaliacaoNome}); nota = % de acerto ÷ 10.
            O foco de calor fica em volta de cada escola e representa apenas ela. Escolas e coordenadas são fictícias; contorno da ilha e avenidas do OpenStreetMap.</p>
        </details>
      )}
    </div>
  );
}

function Seletor({ rotulo, valor, onChange, opcoes, todos }: { rotulo: string; valor: string; onChange: (v: string) => void; opcoes: string[][]; todos?: string }) {
  return (
    <label className={cn("relative flex h-12 items-center rounded-xl border-2 bg-surface px-4 transition-colors", valor ? "border-azulejo-700" : "border-azulejo-900/15 hover:border-azulejo-500")}>
      <span className="sr-only">{rotulo}</span>
      <select value={valor} onChange={e => onChange(e.target.value)} className="h-full w-full appearance-none bg-transparent pr-8 font-display text-[14px] font-semibold text-ink focus:outline-none">
        <option value="">{todos ?? rotulo}</option>
        {opcoes.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
      </select>
      <ChevronDown size={18} className="pointer-events-none absolute right-3 text-azulejo-700" />
    </label>
  );
}

const SEV: Record<Notificacao["severidade"], { cor: string; rot: string }> = {
  ALTA: { cor: "#d9573f", rot: "Urgente" }, MEDIA: { cor: "#e0aa12", rot: "Atenção" }, BAIXA: { cor: "#2071b7", rot: "Acompanhar" },
};

function Notificacoes({ lista, carregando, onSelecionar, selecionada }: { lista?: Notificacao[]; carregando: boolean; onSelecionar: (id: string) => void; selecionada: string }) {
  return (
    <aside className="flex flex-col rounded-2xl border-2 border-azulejo-900/80 bg-surface xl:h-[624px]" aria-label="Notificações">
      <div className="flex items-center justify-between gap-2 border-b-2 border-azulejo-900/10 px-3.5 py-3">
        <h2 className="font-display text-[19px] font-extrabold tracking-[0.08em] text-azulejo-900">NOTIFICAÇÕES</h2>
        {lista && <span className="rounded-full bg-terracota-600 px-2 py-0.5 text-[12px] font-bold text-white tabular">{lista.length}</span>}
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {carregando && [0, 1, 2].map(i => <Skeleton key={i} className="h-20" />)}
        {lista?.length === 0 && <p className="p-2 text-sm text-ink-3">Nenhum alerta no momento.</p>}
        {lista?.map(n => (
          <button key={n.id} onClick={() => onSelecionar(n.escolaId)}
            className={cn("w-full rounded-xl border-2 p-3 text-left transition-colors hover:bg-azulejo-50/60",
              selecionada === n.escolaId ? "border-azulejo-700 bg-azulejo-50/60" : "border-azulejo-900/15")}>
            <div className="flex gap-2.5">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" style={{ color: SEV[n.severidade].cor }} aria-label={SEV[n.severidade].rot} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug text-ink">{n.titulo}</p>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-2">{n.detalhe}</p>
                <p className="mt-1 text-[11px] text-ink-3">{n.escolaNome}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function CartaoEscola({ e, analise, materia, crit, podeAbrir, onFechar }: {
  e: EscolaAnalise; analise: Analise; materia: string; crit: { adequado: number; atencao: number }; podeAbrir: boolean; onFechar: () => void;
}) {
  return (
    <div className="absolute right-3 top-14 z-[500] w-[290px] max-w-[calc(100%-24px)] rounded-2xl border-2 border-azulejo-900/80 bg-white p-4 shadow-[var(--shadow-pop)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-[16px] font-bold leading-tight">{e.nome}</p>
          <p className="text-[12px] text-ink-3">{e.bairro} · {e.territorioNome}</p>
          <p className="text-[12px] text-ink-3">{PORTE_ROTULO[e.porte].split(" · ")[0]} · {e.matriculasEscola.toLocaleString("pt-BR")} estudantes</p>
        </div>
        <button onClick={onFechar} className="rounded-md p-1 text-ink-3 hover:bg-canvas" aria-label="Fechar"><X size={16} /></button>
      </div>
      <ul className="mt-3 space-y-1.5">
        {ANALISES.map(a => {
          const fx = faixaAnalise(e, a.id, crit, materia);
          return (
            <li key={a.id} className={cn("flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-[12.5px]", a.id === analise && "bg-azulejo-50")}>
              <span className="text-ink-2">{a.curto}</span>
              <span className="inline-flex items-center gap-1.5 font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_FAIXA[fx] }} />{valorAnalise(e, a.id, materia)}</span>
            </li>
          );
        })}
      </ul>
      {e.escassez.funcoes.length > 0 && <p className="mt-2 text-[11.5px] text-ink-2">{e.escassez.faltam === 1 ? "Falta" : "Faltam"} {e.escassez.funcoes.map(d => `${d.faltam} ${funcaoTexto(d.funcao, d.faltam)}`).join(" e ")}.</p>}
      {podeAbrir
        ? <Link href={`/escolas/${e.id}`} className="mt-3 flex w-full items-center justify-center rounded-lg bg-azulejo-700 px-3 py-2 text-[13px] font-semibold text-white hover:bg-azulejo-600">Abrir escola</Link>
        : <p className="mt-3 text-[11.5px] text-ink-3">Diagnóstico detalhado restrito à equipe da escola.</p>}
    </div>
  );
}

function funcaoTexto(funcao: string, n: number) {
  const pl = n > 1;
  if (funcao.startsWith("Professor(a) ")) return (pl ? "professores " : "professor(a) ") + funcao.slice("Professor(a) ".length);
  if (funcao.startsWith("Profissional de apoio")) return pl ? "profissionais de apoio da educação especial" : "profissional de apoio da educação especial";
  if (funcao.startsWith("Coordenação")) return pl ? "coordenadores pedagógicos" : "coordenador(a) pedagógico(a)";
  return funcao.toLowerCase();
}
