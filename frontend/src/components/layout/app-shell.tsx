"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Map, School, ClipboardCheck, Menu, X, LogOut, ChevronDown, Repeat, FlaskConical } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/format";
import type { Usuario } from "@/lib/types";
import { Logo, LogoMark, LogoPrefeitura } from "./logo";
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
    <div className="azulejo-fundo flex min-h-screen flex-col">
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

      <main id="conteudo" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 md:px-8 md:py-6">
        {children}
      </main>

      <Rodape />
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
    <header className="sticky top-0 z-40 shadow-[0_8px_20px_-14px_rgb(8_28_51/0.7)]">
      <div className="azulejo-pattern text-white">
        <div className="faixa-slz-h h-[3px]" aria-hidden />
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
          {/* Marca do projeto + co-assinatura da Prefeitura */}
          <div className="flex items-center gap-3">
            <button
              className="md:hidden rounded-lg p-2 text-white/85 hover:bg-white/10"
              onClick={onToggleMobile}
              aria-label={menuMobile ? "Fechar menu" : "Abrir menu"}
            >
              {menuMobile ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href="/rede" aria-label="Início">
              <Logo />
            </Link>
            <span className="hidden xl:block h-9 w-px bg-white/15" aria-hidden />
            <span className="hidden xl:flex items-center rounded-lg bg-white px-2 py-0.5 shadow-sm">
              <LogoPrefeitura altura={44} />
            </span>
          </div>

          {/* Navegação principal: os 3 módulos */}
          <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-1.5">
            {NAV_ITENS.map(item => {
              const ativo = isAtivo(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[14px] font-semibold transition-all",
                    ativo
                      ? "bg-white text-azulejo-900 shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {ativo && <span className="absolute inset-x-4 -bottom-[3px] h-[3px] rounded-full bg-sol" aria-hidden />}
                </Link>
              );
            })}
          </nav>

          {/* Selo + perfil do usuário */}
          <div className="flex items-center gap-2">
            <span className="hidden 2xl:inline-flex items-center gap-1.5 rounded-full border border-sol/50 bg-sol/15 px-2.5 py-1 text-[11px] font-semibold text-sol">
              <FlaskConical size={12} aria-hidden />DEMONSTRATIVO
            </span>
            <div className="relative">
              <button
                onClick={() => setPerfilAberto(!perfilAberto)}
                aria-expanded={perfilAberto}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/10"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-sol text-xs font-bold text-azulejo-900 ring-2 ring-white/20"
                  aria-hidden
                >
                  {usuario.nome
                    .split(" ")
                    .map(p => p[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="hidden lg:block text-left leading-tight">
                  <span className="block text-[13px] font-semibold text-white">{usuario.nome}</span>
                  <span className="block text-[11.5px] text-white/60">
                    {PAPEL_ROTULO[usuario.papel]}
                    {usuario.escolaNome ? ` · ${usuario.escolaNome}` : ""}
                  </span>
                </span>
                <ChevronDown size={15} className="text-white/60" />
              </button>
              {perfilAberto && (
                <PerfilMenu usuario={usuario} onClose={() => setPerfilAberto(false)} onSair={sair} />
              )}
            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        {menuMobile && (
          <nav aria-label="Navegação móvel" className="border-t border-white/10 px-4 py-3 space-y-1 md:hidden">
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
                    ativo ? "bg-white text-azulejo-900" : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Barrado de azulejo português, como a base das fachadas do Centro Histórico */}
      <div className="azulejo-barrado h-[12px] [background-size:24px_24px] border-b border-azulejo-200" aria-hidden />
    </header>
  );
}

function Rodape() {
  return (
    <footer className="mt-8 text-white">
      <div className="azulejo-barrado h-[18px] [background-size:36px_36px] border-t border-azulejo-200" aria-hidden />
      <div className="azulejo-pattern">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-4">
            <span className="flex shrink-0 items-center rounded-xl bg-white px-2.5 py-1 shadow-sm">
              <LogoPrefeitura altura={52} />
            </span>
            <div className="text-[12px] leading-snug text-white/65">
              <p className="font-display text-[13px] font-semibold text-white">Conecta Educação · São Luís do Maranhão</p>
              <p>Hackathon São Luís do Futuro · Desafio 6 · SEMED</p>
              <p className="text-white/45">Ambiente demonstrativo com dados fictícios.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10.5px] leading-snug text-white/40 md:text-right">
            <p>
              Fotos: Centro Histórico (JLPizzol, CC BY-SA 4.0) e Palácio dos Leões (CC0) — Wikimedia Commons.
              <br />Mapa © colaboradores do OpenStreetMap (ODbL).
            </p>
            <LogoMark size={28} centro="#0d2b4a" />
          </div>
        </div>
        <div className="faixa-slz-h h-[4px]" aria-hidden />
      </div>
    </footer>
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
        className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface p-2 text-ink shadow-[var(--shadow-pop)]"
      >
        <div className="faixa-slz-h -mx-2 -mt-2 mb-2 h-[3px]" aria-hidden />
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
