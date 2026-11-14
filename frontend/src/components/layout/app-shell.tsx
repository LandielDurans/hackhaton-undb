"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Map, School, ClipboardCheck, Menu, X, LogOut, ChevronDown, Repeat } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/format";
import type { Usuario } from "@/lib/types";
import { Logo } from "./logo";
import { PageLoading } from "@/components/ui/states";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  match: string;
}

const NAV_ITENS: NavItem[] = [
  { href: "/rede", label: "Análise Regional", icon: Map, match: "^/rede" },
  { href: "/escolas", label: "Análise por Escola", icon: School, match: "^/escolas" },
  { href: "/frequencia", label: "Marcação de Frequência", icon: ClipboardCheck, match: "^/frequencia" },
];

const PAPEL_ROTULO: Record<string, string> = {
  GESTOR_REDE: "Gestão da rede",
  COORDENADOR: "Coordenação",
  PROFESSOR: "Professor(a)",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuMobile, setMenuMobile] = useState(false);

  useEffect(() => {
    if (!carregando && !usuario) router.replace("/login");
  }, [carregando, usuario, router]);

  useEffect(() => {
    setMenuMobile(false);
  }, [pathname]);

  if (carregando || !usuario) {
    return <div className="p-8"><PageLoading /></div>;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>

      <Topbar
        usuario={usuario}
        pathname={pathname}
        menuMobile={menuMobile}
        onToggleMobile={() => setMenuMobile(v => !v)}
      />

      <main id="conteudo" className="mx-auto max-w-[1440px] px-4 py-5 md:px-8 md:py-6">
        {children}
      </main>
    </div>
  );
}

function Topbar({
  usuario,
  pathname,
  menuMobile,
  onToggleMobile,
}: {
  usuario: Usuario;
  pathname: string;
  menuMobile: boolean;
  onToggleMobile: () => void;
}) {
  const { sair } = useAuth();
  const [perfilAberto, setPerfilAberto] = useState(false);

  const isAtivo = (item: NavItem) => new RegExp(item.match).test(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="faixa-slz-h h-[3px]" aria-hidden />
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden rounded-lg p-2 text-ink-2 hover:bg-canvas"
            onClick={onToggleMobile}
            aria-label={menuMobile ? "Fechar menu" : "Abrir menu"}
          >
            {menuMobile ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/rede" aria-label="Início">
            <Logo claro />
          </Link>
        </div>

        {/* Navegação principal: exatamente os 3 botões */}
        <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-2">
          {NAV_ITENS.map(item => {
            const ativo = isAtivo(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-semibold transition-all",
                  ativo
                    ? "bg-azulejo-700 text-white shadow-sm"
                    : "text-ink-2 hover:bg-azulejo-50 hover:text-azulejo-900"
                )}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Perfil do usuário */}
        <div className="relative">
          <button
            onClick={() => setPerfilAberto(!perfilAberto)}
            aria-expanded={perfilAberto}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-canvas"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-azulejo-700 text-xs font-bold text-white"
              aria-hidden
            >
              {usuario.nome
                .split(" ")
                .map(p => p[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span className="hidden lg:block text-left leading-tight">
              <span className="block text-[13px] font-semibold text-ink">{usuario.nome}</span>
              <span className="block text-[11.5px] text-ink-3">
                {PAPEL_ROTULO[usuario.papel]}
                {usuario.escolaNome ? ` · ${usuario.escolaNome}` : ""}
              </span>
            </span>
            <ChevronDown size={15} className="text-ink-3" />
          </button>
          {perfilAberto && (
            <PerfilMenu usuario={usuario} onClose={() => setPerfilAberto(false)} onSair={sair} />
          )}
        </div>
      </div>

      {/* Menu Mobile */}
      {menuMobile && (
        <nav
          aria-label="Navegação móvel"
          className="border-t border-line bg-surface px-4 py-3 space-y-1 md:hidden"
        >
          {NAV_ITENS.map(item => {
            const ativo = isAtivo(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[14px] font-semibold transition-colors",
                  ativo
                    ? "bg-azulejo-700 text-white"
                    : "text-ink-2 hover:bg-azulejo-50 hover:text-azulejo-900"
                )}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

function PerfilMenu({
  usuario,
  onClose,
  onSair,
}: {
  usuario: Usuario;
  onClose: () => void;
  onSair: () => void;
}) {
  const { entrar } = useAuth();
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["perfis-demo"],
    queryFn: () => api.get<{ perfis: Usuario[]; senha: string }>("/api/auth/perfis-demo"),
  });

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
      <div
        role="menu"
        className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]"
      >
        <div className="px-3 py-2 border-b border-line mb-1">
          <p className="text-[13px] font-semibold">{usuario.nome}</p>
          <p className="text-xs text-ink-3">{usuario.cargo}</p>
        </div>
        <p className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3 flex items-center gap-1">
          <Repeat size={11} />
          Trocar perfil de demonstração
        </p>
        {data?.perfis
          .filter(p => p.id !== usuario.id)
          .map(p => (
            <button
              key={p.id}
              role="menuitem"
              onClick={() => trocar(p)}
              className="w-full rounded-lg px-3 py-2 text-left hover:bg-azulejo-50"
            >
              <span className="block text-[13px] font-medium">{p.nome}</span>
              <span className="block text-[11.5px] text-ink-3">
                {PAPEL_ROTULO[p.papel]}
                {p.escolaNome ? ` · ${p.escolaNome}` : ""}
              </span>
            </button>
          ))}
        <button
          role="menuitem"
          onClick={onSair}
          className="mt-1 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-atencao hover:bg-atencao-bg border-t border-line"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </>
  );
}
