import type { EscolaAnalise } from "./types";
import { COR_FAIXA, type Faixa } from "./calor";

/** As cinco análises do painel (cartões do topo). */
export type Analise = "evasao" | "notas" | "materia" | "escassez" | "inclusao";

export const ANALISES: { id: Analise; titulo: string; curto: string }[] = [
  { id: "evasao", titulo: "Análise de Evasão Escolar", curto: "Evasão" },
  { id: "notas", titulo: "Análise do Desempenho por Notas", curto: "Notas" },
  { id: "materia", titulo: "Análise do Desempenho por Matéria", curto: "Matéria" },
  { id: "escassez", titulo: "Análise de Escassez de Professores", curto: "Professores" },
  { id: "inclusao", titulo: "Análise de Alunos da Ed. Especial", curto: "Ed. Especial" },
];

type Crit = { adequado: number; atencao: number };

/** Faixa de cor (vermelho, amarelo, azul, verde) de uma escola na análise escolhida. */
export function faixaAnalise(e: EscolaAnalise, a: Analise, crit: Crit, materia: string): Faixa {
  const meio = (crit.atencao + crit.adequado) / 2;
  const porNota = (n?: number) => n === undefined || n === null ? "sem"
    : n * 10 < crit.atencao ? "vermelho" : n * 10 < meio ? "amarelo" : n * 10 < crit.adequado ? "azul" : "verde";
  switch (a) {
    case "evasao": {
      const t = e.evasao.taxa;
      if (t === undefined || t === null) return "sem";
      return t >= 20 ? "vermelho" : t >= 10 ? "amarelo" : t >= 5 ? "azul" : "verde";
    }
    case "notas": return porNota(e.notas.nota) as Faixa;
    case "materia": return porNota(e.porMateria[materia]?.nota) as Faixa;
    case "escassez": {
      const f = e.escassez.faltam;
      return f >= 3 ? "vermelho" : f === 2 ? "amarelo" : f === 1 ? "azul" : "verde";
    }
    case "inclusao": {
      const c = e.inclusao?.cobertura;
      if (c === undefined || c === null) return "sem";
      return c < 50 ? "vermelho" : c < 75 ? "amarelo" : c < 90 ? "azul" : "verde";
    }
  }
}

export function legendaAnalise(a: Analise, crit: Crit): [Faixa, string][] {
  const meio = (crit.atencao + crit.adequado) / 20;
  const nota = (v: number) => (v / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  switch (a) {
    case "evasao": return [["vermelho", "20% ou mais de evasão"], ["amarelo", "10% a 20%"], ["azul", "5% a 10%"], ["verde", "Menos de 5%"]];
    case "notas":
    case "materia": return [["vermelho", `Nota abaixo de ${nota(crit.atencao)}`], ["amarelo", `${nota(crit.atencao)} a ${meio.toLocaleString("pt-BR")}`],
      ["azul", `${meio.toLocaleString("pt-BR")} a ${nota(crit.adequado)}`], ["verde", `${nota(crit.adequado)} ou mais`]];
    case "escassez": return [["vermelho", "Faltam 3+ profissionais"], ["amarelo", "Faltam 2"], ["azul", "Falta 1"], ["verde", "Quadro completo"]];
    case "inclusao": return [["vermelho", "Menos de 50% atendidos"], ["amarelo", "50% a 75%"], ["azul", "75% a 90%"], ["verde", "90% ou mais atendidos"]];
  }
}

export function valorAnalise(e: EscolaAnalise, a: Analise, materia: string): string {
  const n = (v?: number) => v === undefined || v === null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  switch (a) {
    case "evasao": return e.evasao.taxa === undefined || e.evasao.taxa === null ? "—" : `${Math.round(e.evasao.taxa)}% de evasão`;
    case "notas": return `nota ${n(e.notas.nota)}`;
    case "materia": return `nota ${n(e.porMateria[materia]?.nota)}`;
    case "escassez": return e.escassez.faltam === 0 ? "quadro completo" : `faltam ${e.escassez.faltam}`;
    case "inclusao": return e.inclusao?.cobertura === undefined || e.inclusao?.cobertura === null ? "dado protegido" : `${Math.round(e.inclusao.cobertura)}% atendidos`;
  }
}

export { COR_FAIXA };
