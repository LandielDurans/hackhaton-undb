"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Map, Target, School, Users, Sparkles, ClipboardList, LineChart, GraduationCap, BookOpenCheck, Info, ShieldCheck,
  Menu, X, LogOut, ChevronDown, Repeat, FlaskConical,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/format";
import type { Usuario } from "@/lib/types";
import { Logo } from "./logo";
import { PageLoading } from "@/components/ui/states";

interface Item { href: string; label: string; icon: React.ComponentType<{ size?: number }>; match?: string }

function navegacao(u: Usuario): { grupo: string; itens: Item[] }[] {
  const g: { grupo: string; itens: Item[] }[] = [
    { grupo: "Rede municipal", itens: [
      { href: "/rede", label: "Mapa da rede", icon: Map, match: "/rede$" },
      { href: "/rede/prioridades", label: "Prioridades regionais", icon: Target },
    ] },
  ];
  const escola: Item[] = [];
  if (u.papel !== "GESTOR_REDE") {
    escola.push({ href: `/escolas/${u.escolaId}`, label: "Minha escola", icon: School, match: "/escolas" });
    escola.push({ href: "/turmas", label: u.papel === "PROFESSOR" ? "Minhas turmas" : "Turmas", icon: Users, match: "/turmas" });
    escola.push({ href: "/assistente", label: "Assistente docente", icon: Sparkles, match: "/assistente|/estudantes" });
  }
  if (escola.length) g.push({ grupo: "Escola e turmas", itens: escola });
  g.push({ grupo: "Planejar e acompanhar", itens: [
    { href: "/planos", label: "Planos de ação", icon: ClipboardList, match: "/planos" },
    { href: "/acompanhamento", label: "Acompanhamento", icon: LineChart },
    { href: "/formacao", label: "Formação continuada", icon: GraduationCap },
  ] });
  const ref: Item[] = [
    { href: "/curriculo", label: "Currículo e habilidades", icon: BookOpenCheck },
    { href: "/sobre", label: "Metodologia e dados", icon: Info },
  ];
  if (u.papel === "GESTOR_REDE") ref.push({ href: "/auditoria", label: "Auditoria de acessos", icon: ShieldCheck });
  g.push({ grupo: "Referência", itens: ref });
  return g;
}

const PAPEL_ROTULO: Record<string, string> = { GESTOR_REDE: "Gestão da rede", COORDENADOR: "Coordenação", PROFESSOR: "Professor(a)" };

export function AppShell({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);

  useEffect(() => { if (!carregando && !usuario) router.replace("/login"); }, [carregando, usuario, router]);
  useEffect(() => setMenu(false), [pathname]);

  if (carregando || !usuario) {
    return <div className="p-8"><PageLoading /></div>;
  }

  const ativo = (i: Item) => (i.match ? new RegExp("^(" + i.match + ")").test(pathname) || pathname === i.href : pathname.startsWith(i.href));

  const sidebar = (
    <nav aria-label="Navegação principal" className="flex h-full flex-col">
      <div className="azulejo-pattern px-5 py-5">
        <Link href="/inicio" aria-label="Início"><Logo /></Link>
      </div>
      <div className="faixas-ma h-[9px]" aria-hidden />
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 bg-azulejo-900">
        {navegacao(usuario).map(g => (
          <div key={g.grupo}>
            <p className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/45">{g.grupo}</p>
            <ul className="space-y-0.5">
              {g.itens.map(i => {
                const a = ativo(i);
                return (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={a ? "page" : undefined}
                      className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
                        a ? "bg-white text-azulejo-900 font-semibold" : "text-white/75 hover:bg-white/8 hover:text-white")}>
                      <i.icon size={17} />{i.label}
                      {a && <span className="ml-auto h-2 w-2 rounded-full bg-terracota-600" aria-hidden />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="bg-azulejo-900 border-t border-white/10 px-5 py-3 text-[11px] leading-snug text-white/50">
        Hackathon São Luís do Futuro · Desafio 6<br />Dados demonstrativos e fictícios
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-[248px]">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-md focus:bg-white focus:px-3 focus:py-2">Pular para o conteúdo</a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block">{sidebar}</aside>
      {menu && (
        <div className="fixed inset-0 z-[1500] lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setMenu(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] shadow-xl">{sidebar}</aside>
          <button className="absolute right-4 top-4 rounded-full bg-white p-2" onClick={() => setMenu(false)} aria-label="Fechar menu"><X size={18} /></button>
        </div>
      )}
      <Topbar usuario={usuario} onMenu={() => setMenu(true)} />
      <main id="conteudo" className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}

function Topbar({ usuario, onMenu }: { usuario: Usuario; onMenu: () => void }) {
  const { sair } = useAuth();
  const [aberto, setAberto] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="faixas-ma-h h-[3px] lg:hidden" aria-hidden />
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 md:px-8">
        <button className="lg:hidden rounded-md p-1.5 text-ink-2 hover:bg-canvas" onClick={onMenu} aria-label="Abrir menu"><Menu size={20} /></button>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-terracota-500/30 bg-terracota-50 px-2.5 py-1 text-[11.5px] font-semibold text-terracota-600">
          <FlaskConical size={13} aria-hidden />DEMONSTRATIVO<span className="hidden sm:inline"> · dados fictícios</span>
        </span>
        <div className="ml-auto relative">
          <button onClick={() => setAberto(!aberto)} aria-expanded={aberto} aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-canvas">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-azulejo-700 text-xs font-bold text-white" aria-hidden>
              {usuario.nome.split(" ").map(p => p[0]).slice(0, 2).join("")}
            </span>
            <span className="hidden sm:block text-left leading-tight">
              <span className="block text-[13px] font-semibold text-ink">{usuario.nome}</span>
              <span className="block text-[11.5px] text-ink-3">{PAPEL_ROTULO[usuario.papel]}{usuario.escolaNome ? ` · ${usuario.escolaNome}` : ""}</span>
            </span>
            <ChevronDown size={15} className="text-ink-3" />
          </button>
          {aberto && <PerfilMenu usuario={usuario} onClose={() => setAberto(false)} onSair={sair} />}
        </div>
      </div>
    </header>
  );
}

function PerfilMenu({ usuario, onClose, onSair }: { usuario: Usuario; onClose: () => void; onSair: () => void }) {
  const { entrar } = useAuth();
  const router = useRouter();
  const { data } = useQuery({ queryKey: ["perfis-demo"], queryFn: () => api.get<{ perfis: Usuario[]; senha: string }>("/api/auth/perfis-demo") });
  const trocar = async (u: Usuario) => {
    if (!data) return;
    const novo = await entrar(u.email, data.senha);
    onClose();
    const { paginaInicial } = await import("@/lib/auth");
    router.push(paginaInicial(novo));
  };
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div role="menu" className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
        <div className="px-3 py-2 border-b border-line mb-1">
          <p className="text-[13px] font-semibold">{usuario.nome}</p>
          <p className="text-xs text-ink-3">{usuario.cargo}</p>
        </div>
        <p className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3 flex items-center gap-1"><Repeat size={11} />Trocar perfil de demonstração</p>
        {data?.perfis.filter(p => p.id !== usuario.id).map(p => (
          <button key={p.id} role="menuitem" onClick={() => trocar(p)} className="w-full rounded-lg px-3 py-2 text-left hover:bg-azulejo-50">
            <span className="block text-[13px] font-medium">{p.nome}</span>
            <span className="block text-[11.5px] text-ink-3">{PAPEL_ROTULO[p.papel]}{p.escolaNome ? ` · ${p.escolaNome}` : ""}</span>
          </button>
        ))}
        <button role="menuitem" onClick={onSair} className="mt-1 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-atencao hover:bg-atencao-bg border-t border-line">
          <LogOut size={15} />Sair
        </button>
      </div>
    </>
  );
}
