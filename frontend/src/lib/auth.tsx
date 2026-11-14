"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Usuario } from "./types";

interface AuthCtx {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  sair: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    api.get<Usuario>("/api/auth/me").then(setUsuario).catch(() => setUsuario(null)).finally(() => setCarregando(false));
    const h = () => { setUsuario(null); router.replace("/login"); };
    window.addEventListener("conecta:nao-autenticado", h);
    return () => window.removeEventListener("conecta:nao-autenticado", h);
  }, [router]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const r = await api.post<{ usuario: Usuario }>("/api/auth/login", { email, senha });
    qc.clear();
    setUsuario(r.usuario);
    return r.usuario;
  }, [qc]);

  const sair = useCallback(async () => {
    await api.post("/api/auth/logout").catch(() => undefined);
    qc.clear();
    setUsuario(null);
    router.replace("/login");
  }, [qc, router]);

  return <Ctx.Provider value={{ usuario, carregando, entrar, sair }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}

export function paginaInicial(u: Usuario): string {
  if (u.papel === "GESTOR_REDE") return "/rede";
  if (u.papel === "COORDENADOR") return `/escolas/${u.escolaId}`;
  return "/frequencia";
}
