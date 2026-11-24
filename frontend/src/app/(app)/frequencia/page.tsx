"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileImage,
  AlertCircle,
  Send,
  Sparkles,
  UserCheck,
  UserX,
  RefreshCw,
} from "lucide-react";
import { useMeta } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { PainelEscolas } from "@/lib/types";
import { ErrorState, PageLoading } from "@/components/ui/states";
import { BannerSaoLuis } from "@/components/layout/banner";
import { cn } from "@/lib/format";

interface AlunoChamada {
  id: string;
  nome: string;
  faltasMes: number;
  presente: boolean;
  motivo?: string;
  observacao?: string;
}

const ALUNOS_INICIAIS: AlunoChamada[] = [
  { id: "A-01", nome: "Ana Beatriz Ferreira", faltasMes: 1, presente: true },
  { id: "A-02", nome: "Carlos Eduardo Mendes", faltasMes: 2, presente: true },
  { id: "A-03", nome: "Gabriel Henrique Costa", faltasMes: 0, presente: true },
  { id: "A-04", nome: "Larissa Souza Martins", faltasMes: 4, presente: true },
  { id: "A-05", nome: "Miguel Tavares da Silva", faltasMes: 12, presente: false },
  { id: "A-06", nome: "Pedro Lucas Oliveira", faltasMes: 3, presente: true },
  { id: "A-07", nome: "Sofia Ribeiro dos Santos", faltasMes: 8, presente: false },
  { id: "A-08", nome: "Vitória Camila Pereira", faltasMes: 1, presente: true },
];

const MOTIVOS_EVASAO = [
  "Mobilidade / Transporte escolar",
  "Vulnerabilidade financeira",
  "Aluno precisa trabalhar / apoio familiar",
  "Questões de saúde",
  "Mudança de endereço / bairro",
  "Outro motivo",
];

export default function FrequenciaPage() {
  const { usuario } = useAuth();
  const meta = useMeta();
  const painel = useQuery({
    queryKey: ["painel-escolas-freq"],
    queryFn: () => api.get<PainelEscolas>("/api/rede/escolas"),
  });

  const [escolaId, setEscolaId] = useState("");
  const [turma, setTurma] = useState("5º Ano A - Matutino");
  const [dataAula, setDataAula] = useState(() => new Date().toISOString().slice(0, 10));
  const [alunos, setAlunos] = useState<AlunoChamada[]>(ALUNOS_INICIAIS);

  const [processandoIA, setProcessandoIA] = useState(false);
  const [fotoNome, setFotoNome] = useState<string | null>(null);
  const [iaConcluida, setIaConcluida] = useState(false);
  const [sincronizado, setSincronizado] = useState(false);

  const escolaSelecionada = useMemo(() => {
    const lista = painel.data?.escolas ?? [];
    if (escolaId) return lista.find(e => e.id === escolaId);
    if (usuario?.escolaId) return lista.find(e => e.id === usuario.escolaId) ?? lista[0];
    return lista[0];
  }, [painel.data, escolaId, usuario]);

  if (meta.isLoading || !usuario) return <PageLoading />;
  if (meta.error) return <ErrorState error={meta.error} />;

  const togglePresenca = (id: string) => {
    setSincronizado(false);
    setAlunos(prev =>
      prev.map(a => (a.id === id ? { ...a, presente: !a.presente } : a))
    );
  };

  const atualizarMotivo = (id: string, motivo: string) => {
    setSincronizado(false);
    setAlunos(prev => prev.map(a => (a.id === id ? { ...a, motivo } : a)));
  };

  const atualizarObservacao = (id: string, observacao: string) => {
    setSincronizado(false);
    setAlunos(prev => prev.map(a => (a.id === id ? { ...a, observacao } : a)));
  };

  const simularLeituraIA = (nomeArquivo?: string) => {
    setSincronizado(false);
    setIaConcluida(false);
    setProcessandoIA(true);
    setFotoNome(nomeArquivo || "folha_chamada_5anoA_manuscrita.jpg");

    setTimeout(() => {
      setAlunos(prev =>
        prev.map(a => {
          if (a.id === "A-05" || a.id === "A-07") return { ...a, presente: false };
          return { ...a, presente: true };
        })
      );
      setProcessandoIA(false);
      setIaConcluida(true);
    }, 900);
  };

  const faltososRecorrentes = alunos.filter(a => !a.presente && a.faltasMes >= 5);
  const totalPresentes = alunos.filter(a => a.presente).length;
  const totalFaltas = alunos.length - totalPresentes;

  const enviarGeduc = () => {
    setSincronizado(true);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho: painel de azulejos (sem foto) */}
      <BannerSaoLuis
        eyebrow="Integração GEDUC · Inclusão docente e busca ativa"
        titulo="Marcação de Frequência"
        descricao="Registre a chamada digitalmente ou envie uma foto da folha de presença manuscrita para leitura automática via IA."
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-azulejo-900/70 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur">
          <Sparkles size={14} className="text-sol" />
          OCR Econômico (Gemini Flash-Lite · ~US$ 0,00018/folha)
        </div>
      </BannerSaoLuis>

      {/* Seletores da Turma */}
      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-ink-3 mb-1">Escola</label>
          <select
            value={escolaSelecionada?.id || ""}
            onChange={e => setEscolaId(e.target.value)}
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-azulejo-500 focus:outline-none"
          >
            {(painel.data?.escolas ?? [])
              .slice()
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map(e => (
                <option key={e.id} value={e.id}>
                  {e.nome} ({e.bairro})
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-3 mb-1">Turma</label>
          <select
            value={turma}
            onChange={e => setTurma(e.target.value)}
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-azulejo-500 focus:outline-none"
          >
            <option>5º Ano A - Matutino</option>
            <option>5º Ano B - Vespertino</option>
            <option>2º Ano A - Matutino</option>
            <option>9º Ano A - Matutino</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-3 mb-1">Data da Aula</label>
          <input
            type="date"
            value={dataAula}
            onChange={e => setDataAula(e.target.value)}
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-azulejo-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Coluna Esquerda: Leitura por Foto IA + Chamada */}
        <div className="space-y-4 lg:col-span-3">
          {/* Card Leitor IA */}
          <div className="rounded-2xl border-2 border-dashed border-azulejo-500/40 bg-azulejo-50/40 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-azulejo-700 text-white">
                  <Camera size={20} />
                </div>
                <div>
                  <h2 className="font-display text-[15.5px] font-bold text-ink">
                    Ler folha de presença por foto (IA)
                  </h2>
                  <p className="text-xs text-ink-2 mt-0.5">
                    Ideal para professores que preferem o diário em papel: fotografe a folha e a IA preenche o GEDUC automaticamente.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-azulejo-700 bg-surface px-3.5 py-2 text-xs font-semibold text-azulejo-700 hover:bg-azulejo-50">
                  <FileImage size={15} />
                  Enviar foto
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) simularLeituraIA(file.name);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => simularLeituraIA()}
                  disabled={processandoIA}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-azulejo-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-azulejo-600 disabled:opacity-60"
                >
                  {processandoIA ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Lendo folha...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Simular leitura IA
                    </>
                  )}
                </button>
              </div>
            </div>

            {iaConcluida && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface px-3.5 py-2 text-xs text-ink border border-line">
                <CheckCircle2 size={15} className="text-adequado shrink-0" />
                <span>
                  Imagem <strong>{fotoNome}</strong> processada com 98,4% de confiança.{" "}
                  <strong>{totalPresentes}</strong> presentes e <strong>{totalFaltas}</strong> ausentes identificados.
                </span>
              </div>
            )}
          </div>

          {/* Lista da Turma */}
          <div className="rounded-2xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={17} className="text-azulejo-700" />
                <h2 className="font-display text-[15px] font-bold text-ink">
                  Lista de Frequência · {turma}
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="text-adequado">{totalPresentes} presentes</span>
                <span className="text-atencao">{totalFaltas} faltas</span>
              </div>
            </div>

            <ul className="divide-y divide-line">
              {alunos.map(aluno => (
                <li
                  key={aluno.id}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-canvas/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{aluno.nome}</p>
                    <p className="text-xs text-ink-3">
                      Acumulado no mês:{" "}
                      <span
                        className={cn(
                          "font-semibold",
                          aluno.faltasMes >= 5 ? "text-atencao" : "text-ink-2"
                        )}
                      >
                        {aluno.faltasMes} {aluno.faltasMes === 1 ? "falta" : "faltas"}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePresenca(aluno.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors",
                      aluno.presente
                        ? "bg-adequado-bg text-adequado border border-adequado/25"
                        : "bg-atencao-bg text-atencao border border-atencao/25"
                    )}
                  >
                    {aluno.presente ? (
                      <>
                        <UserCheck size={14} /> Presente
                      </>
                    ) : (
                      <>
                        <UserX size={14} /> Falta
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Coluna Direita: Busca Ativa Contextual + Envio GEDUC */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-line bg-surface p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-atencao shrink-0" />
              <h2 className="font-display text-[15.5px] font-bold text-ink">
                Busca Ativa Inteligente
              </h2>
            </div>

            {faltososRecorrentes.length === 0 ? (
              <p className="text-xs text-ink-2">
                Nenhum estudante ausente hoje possui histórico crítico de faltas recorrentes neste mês.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-ink-2">
                  Identificamos ausências recorrentes na chamada de hoje. Ajude a secretaria a mapear os motivos de evasão:
                </p>

                {faltososRecorrentes.map(aluno => (
                  <div
                    key={aluno.id}
                    className="rounded-xl border border-atencao/30 bg-atencao-bg/40 p-3.5 space-y-2.5"
                  >
                    <p className="text-xs font-semibold text-ink">
                      O aluno <strong>{aluno.nome}</strong> teve{" "}
                      <span className="text-atencao font-bold">{aluno.faltasMes} faltas</span> este mês. Você sabe o motivo?
                    </p>

                    <select
                      value={aluno.motivo || ""}
                      onChange={e => atualizarMotivo(aluno.id, e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-xs text-ink focus:border-azulejo-500 focus:outline-none"
                    >
                      <option value="">Selecione um possível motivo...</option>
                      {MOTIVOS_EVASAO.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <textarea
                      rows={2}
                      value={aluno.observacao || ""}
                      onChange={e => atualizarObservacao(aluno.id, e.target.value)}
                      placeholder="Observações para a equipe de busca ativa / assistência social..."
                      className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:border-azulejo-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={enviarGeduc}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-azulejo-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-azulejo-600"
            >
              <Send size={16} />
              Registrar Presenças e Sincronizar GEDUC
            </button>

            {sincronizado && (
              <div className="flex items-start gap-2 rounded-xl border border-adequado/30 bg-adequado-bg px-3.5 py-2.5 text-xs text-adequado">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>
                  Frequência de <strong>{turma}</strong> ({escolaSelecionada?.nome}) registrada e enviada ao GEDUC com sucesso!
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
