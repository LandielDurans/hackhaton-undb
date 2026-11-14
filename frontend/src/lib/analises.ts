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

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Score contínuo normalizado [0.0 = Crítico/Vermelho .. 0.5 = Atenção/Amarelo .. 1.0 = Adequado/Verde].
 */
export function scoreAnalise(e: EscolaAnalise, a: Analise, crit: Crit, materia: string): number | null {
  switch (a) {
    case "evasao": {
      const t = e.evasao.taxa;
      if (t === undefined || t === null) return null;
      // <= 3% -> 1.0 (verde), ~11.5% -> 0.5 (amarelo), >= 20% -> 0.0 (vermelho)
      return clamp01((20 - t) / 17);
    }
    case "notas": {
      const n = e.notas.nota;
      if (n === undefined || n === null) return null;
      const minN = Math.max(2, crit.atencao / 10 - 1.5);
      const maxN = Math.min(9.5, crit.adequado / 10 + 1.5);
      return clamp01((n - minN) / (maxN - minN));
    }
    case "materia": {
      const n = e.porMateria[materia]?.nota;
      if (n === undefined || n === null) return null;
      const minN = Math.max(2, crit.atencao / 10 - 1.5);
      const maxN = Math.min(9.5, crit.adequado / 10 + 1.5);
      return clamp01((n - minN) / (maxN - minN));
    }
    case "escassez": {
      const f = e.escassez.faltam;
      // 0 -> 1.0 (verde), 2 -> 0.5 (amarelo), 4+ -> 0.0 (vermelho)
      return clamp01((4 - f) / 4);
    }
    case "inclusao": {
      const c = e.inclusao?.cobertura;
      if (c === undefined || c === null) return null;
      // <= 40% -> 0.0 (vermelho), ~67.5% -> 0.5 (amarelo), >= 95% -> 1.0 (verde)
      return clamp01((c - 40) / 55);
    }
  }
}

export function corRgbGradiente(score: number | null): [number, number, number] {
  if (score === null) return [156, 163, 175]; // cinza neutro
  const s = clamp01(score);
  // Paradas: 0.0 = Vermelho [224, 62, 54], 0.5 = Amarelo [234, 179, 8], 1.0 = Verde [34, 197, 94]
  if (s <= 0.5) {
    const t = s / 0.5;
    return [
      Math.round(224 + (234 - 224) * t),
      Math.round(62 + (179 - 62) * t),
      Math.round(54 + (8 - 54) * t),
    ];
  }
  const t = (s - 0.5) / 0.5;
  return [
    Math.round(234 + (34 - 234) * t),
    Math.round(179 + (197 - 179) * t),
    Math.round(8 + (94 - 8) * t),
  ];
}

export function corGradiente(score: number | null): string {
  const [r, g, b] = corRgbGradiente(score);
  return `rgb(${r}, ${g}, ${b})`;
}

export function legendaGradiente(a: Analise, crit: Crit): { min: string; mid: string; max: string } {
  const minN = Math.max(2, crit.atencao / 10 - 1.5).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const maxN = Math.min(9.5, crit.adequado / 10 + 1.5).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  switch (a) {
    case "evasao":
      return { min: "≥ 20% (Crítico)", mid: "11%", max: "≤ 3% (Baixa)" };
    case "notas":
    case "materia":
      return { min: `≤ ${minN}`, mid: "Média", max: `≥ ${maxN}` };
    case "escassez":
      return { min: "4+ vagas", mid: "2 vagas", max: "Completo" };
    case "inclusao":
      return { min: "≤ 40%", mid: "68%", max: "≥ 95%" };
  }
}

export { COR_FAIXA };
