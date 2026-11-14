"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, GraduationCap, Landmark, Lock, MapPinned, School } from "lucide-react";
import { api } from "@/lib/api";
import { paginaInicial, useAuth } from "@/lib/auth";
import type { Usuario } from "@/lib/types";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/states";

const PAPEL = {
  GESTOR_REDE: { rot: "Gestão da rede (SEMED)", Icon: Landmark, desc: "Visão territorial com dados agregados. Sem acesso a dados individuais." },
  COORDENADOR: { rot: "Coordenação pedagógica", Icon: School, desc: "Diagnóstico da escola, turmas, estudantes da escola e planos." },
  PROFESSOR: { rot: "Professor(a)", Icon: GraduationCap, desc: "Turmas e estudantes sob sua responsabilidade e assistente docente." },
} as const;

export default function LoginPage() {
  const { entrar, usuario } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const perfis = useQuery({ queryKey: ["perfis-demo"], queryFn: () => api.get<{ perfis: Usuario[]; senha: string }>("/api/auth/perfis-demo") });

  useEffect(() => { if (usuario) router.replace(paginaInicial(usuario)); }, [usuario, router]);

  const login = async (e: string, s: string, chave: string) => {
    setErro(null);
    setEnviando(chave);
    try {
      const u = await entrar(e, s);
      router.replace(paginaInicial(u));
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(null);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <section className="azulejo-pattern relative flex flex-col justify-between p-8 md:p-12 md:pl-16 text-white overflow-hidden">
        <div className="faixas-ma-v absolute inset-y-0 left-0 w-3 md:w-5" aria-hidden />
        <svg className="pointer-events-none absolute -right-24 -bottom-24 h-[420px] w-[420px] opacity-[0.07]" viewBox="0 0 34 34" aria-hidden>
          <path d="M17 7.5l2.6 7.9h8.3l-6.7 4.9 2.6 7.9L17 23.3l-6.8 4.9 2.6-7.9-6.7-4.9h8.3z" fill="#fff" />
        </svg>
        <Logo />
        <div className="max-w-xl my-12">
          <p className="text-xs font-semibold tracking-[0.2em] text-white/70 mb-4">HACKATHON SÃO LUÍS DO FUTURO · DESAFIO 6</p>
          <h1 className="text-3xl md:text-[42px] font-bold leading-[1.1]">Do território ao estudante: decisões pedagógicas conectadas.</h1>
          <p className="mt-5 text-[15.5px] leading-relaxed text-white/80">
            A SEMED identifica onde existem desafios, a escola compreende o que precisa melhorar e o professor recebe apoio para
            decidir como agir. O Conecta Educação SLZ conecta essas decisões e acompanha seus resultados.
          </p>
          <ol className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12.5px]">
            {[["Integrar", MapPinned], ["Visualizar", Building2], ["Planejar", School], ["Acompanhar", GraduationCap]].map(([t, I], i) => {
              const Icon = I as typeof MapPinned;
              return (
                <li key={t as string} className="rounded-xl bg-white/8 border border-white/12 p-3">
                  <Icon size={16} className="text-white mb-2" />
                  <span className="text-white/55 tabular">0{i + 1}</span> <span className="font-semibold">{t as string}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="text-xs text-white/55 max-w-lg">
          Ambiente de demonstração com dados fictícios. Escolas, estudantes e professores não correspondem a pessoas ou unidades reais.
          Não há integração com sistemas da SEMED ou com o SIMAE.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 md:p-12 bg-canvas">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold">Entrar na demonstração</h2>
          <p className="text-sm text-ink-2 mt-1">Escolha um perfil para ver como as permissões mudam o que cada profissional acessa.</p>

          <div className="mt-6 space-y-2.5">
            {perfis.isLoading && [0, 1, 2].map(i => <Skeleton key={i} className="h-[74px]" />)}
            {perfis.error && <p className="text-sm text-atencao">Não foi possível contatar a API. Verifique se o back-end está em execução.</p>}
            {perfis.data?.perfis.map(p => {
              const cfg = PAPEL[p.papel];
              return (
                <button key={p.id} onClick={() => login(p.email, perfis.data!.senha, p.id)} disabled={!!enviando}
                  className="group w-full flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-left shadow-[var(--shadow-card)] hover:border-azulejo-200 hover:bg-azulejo-50/60 disabled:opacity-60">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-azulejo-50 text-azulejo-700"><cfg.Icon size={19} /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-semibold text-ink">{p.nome}</span>
                    <span className="block text-[12px] text-ink-3 truncate">{cfg.rot}{p.escolaNome ? ` · ${p.escolaNome}` : ""}</span>
                    <span className="block text-[11.5px] text-ink-3 mt-0.5">{cfg.desc}</span>
                  </span>
                  <ArrowRight size={17} className="text-ink-3 group-hover:text-azulejo-700" />
                </button>
              );
            })}
          </div>

          <details className="mt-6 rounded-xl border border-line bg-surface p-4">
            <summary className="cursor-pointer text-sm font-medium text-ink-2 flex items-center gap-2"><Lock size={14} />Entrar com e-mail e senha</summary>
            <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); login(email, senha, "form"); }}>
              <Field label="E-mail" htmlFor="email"><Input id="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></Field>
              <Field label="Senha" htmlFor="senha" hint={perfis.data?.senha ? `Senha de demonstração: ${perfis.data.senha}` : undefined}>
                <Input id="senha" type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} required />
              </Field>
              <Button type="submit" className="w-full" disabled={!!enviando}>Entrar</Button>
            </form>
          </details>
          {erro && <p className="mt-3 text-sm text-atencao" role="alert">{erro}</p>}
        </div>
      </section>
    </div>
  );
}
