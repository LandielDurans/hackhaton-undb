import { twMerge } from "tailwind-merge";
import type { Indicador, Nivel, StatusPlano, Tendencia, Prioridade, EscopoPlano, Decisao } from "./types";

const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("pt-BR");

export const pct = (v?: number | null) => (v === undefined || v === null ? "—" : `${nf1.format(v)}%`);
export const pp = (v?: number | null) => (v === undefined || v === null ? "—" : `${v > 0 ? "+" : ""}${nf1.format(v)} p.p.`);
export const num = (v?: number | null) => (v === undefined || v === null ? "—" : nf0.format(v));

export function dataBR(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
export function dataHoraBR(iso?: string | null) {
  if (!iso) return "—";
  return `${dataBR(iso)} ${iso.slice(11, 16)}`;
}
export function mesAno(iso: string) {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`;
}

export const NIVEL_ROTULO: Record<Nivel, string> = {
  ADEQUADO: "Adequado",
  EM_DESENVOLVIMENTO: "Em desenvolvimento",
  REQUER_ATENCAO: "Precisa de apoio",
};
export const NIVEL_COR: Record<Nivel, string> = {
  ADEQUADO: "var(--color-adequado)",
  EM_DESENVOLVIMENTO: "var(--color-desenvolvimento)",
  REQUER_ATENCAO: "var(--color-atencao)",
};
export const STATUS_ROTULO: Record<StatusPlano, string> = {
  PLANEJADO: "Planejado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  REAVALIADO: "Reavaliado",
};
export const ESCOPO_ROTULO: Record<EscopoPlano, string> = {
  TERRITORIO: "Território",
  ESCOLA: "Escola",
  TURMA: "Turma",
  ESTUDANTE: "Individual",
};
export const TENDENCIA_ROTULO: Record<Tendencia, string> = {
  MELHORA: "Melhora",
  ESTAVEL: "Estável",
  QUEDA: "Queda",
  SEM_COMPARACAO: "Sem comparação",
};
export const PRIORIDADE_ROTULO: Record<Prioridade, string> = { ALTA: "Prioridade alta", MEDIA: "Prioridade média", BAIXA: "Prioridade baixa" };
export const DECISAO_ROTULO: Record<Decisao, string> = {
  FUNCIONOU: "A estratégia funcionou",
  AJUSTAR: "Precisa de ajustes",
  SUBSTITUIR: "Deve ser substituída",
};
export const COMPONENTE_ROTULO: Record<string, string> = { MAT: "Matemática", LP: "Língua Portuguesa" };
export const FORMACAO_STATUS: Record<string, string> = { INSCRICOES: "Inscrições abertas", EM_CURSO: "Em curso", CONCLUIDA: "Concluída" };
export const MODALIDADE: Record<string, string> = { HIBRIDA: "Híbrida", PRESENCIAL: "Presencial", ONLINE: "On-line" };

export function nivelDe(p: number | undefined | null, c: { adequado: number; atencao: number }): Nivel | undefined {
  if (p === undefined || p === null) return undefined;
  return p >= c.adequado ? "ADEQUADO" : p >= c.atencao ? "EM_DESENVOLVIMENTO" : "REQUER_ATENCAO";
}

export function valorIndicador(i?: Indicador, metrica: "acerto" | "adequado" = "acerto") {
  if (!i || i.suprimido) return undefined;
  return metrica === "acerto" ? i.percentualAcerto : i.percentualAdequado;
}

export const cn = (...c: (string | false | null | undefined)[]) => twMerge(c.filter(Boolean).join(" "));
