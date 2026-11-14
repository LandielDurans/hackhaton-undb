import type { EscolaMapa, TerritorioMapa } from "./types";

/** Faixas do mapa de calor: vermelho, amarelo, azul e verde (validadas; sempre acompanhadas de rótulo na legenda). */
export type Faixa = "vermelho" | "amarelo" | "azul" | "verde" | "sem";

export const COR_FAIXA: Record<Faixa, string> = {
  vermelho: "#dc2626",
  amarelo: "#d4a106",
  azul: "#2563eb",
  verde: "#16a34a",
  sem: "#a3a8b0",
};

export type CamadaCalor = "desempenho" | "dificuldades" | "evolucao" | "formacao";

type Crit = { adequado: number; atencao: number; variacaoRelevante: number };

/** Rótulos curtos da legenda, por camada. */
export function legendaCalor(camada: CamadaCalor, crit: Crit, metrica: "acerto" | "adequado"): [Faixa, string][] {
  const meio = Math.round((crit.atencao + crit.adequado) / 2);
  switch (camada) {
    case "desempenho": return metrica === "acerto"
      ? [["vermelho", `Precisa de apoio (< ${crit.atencao}%)`], ["amarelo", `Atenção (${crit.atencao}–${meio}%)`], ["azul", `No caminho (${meio}–${crit.adequado}%)`], ["verde", `Adequado (≥ ${crit.adequado}%)`]]
      : [["vermelho", "< 20% adequados"], ["amarelo", "20–35%"], ["azul", "35–50%"], ["verde", "≥ 50% adequados"]];
    case "dificuldades": return [["vermelho", "5+ habilidades críticas"], ["amarelo", "3–4"], ["azul", "1–2"], ["verde", "Nenhuma"]];
    case "evolucao": return [["vermelho", "Caiu"], ["amarelo", "Estável"], ["azul", "Melhorou"], ["verde", `Melhorou muito (≥ ${crit.variacaoRelevante * 2} p.p.)`]];
    case "formacao": return [["vermelho", "3+ professores sem formação"], ["amarelo", "2"], ["azul", "1"], ["verde", "Nenhum"]];
  }
}

export function faixaEscola(e: EscolaMapa | TerritorioMapa, camada: CamadaCalor, crit: Crit, metrica: "acerto" | "adequado"): Faixa {
  const i = e.indicador;
  switch (camada) {
    case "desempenho": {
      if (i.suprimido || i.percentualAcerto === undefined) return "sem";
      if (metrica === "adequado") {
        const a = i.percentualAdequado ?? 0;
        return a < 20 ? "vermelho" : a < 35 ? "amarelo" : a < 50 ? "azul" : "verde";
      }
      const p = i.percentualAcerto, meio = (crit.atencao + crit.adequado) / 2;
      return p < crit.atencao ? "vermelho" : p < meio ? "amarelo" : p < crit.adequado ? "azul" : "verde";
    }
    case "dificuldades": {
      if (!("habilidadesAtencao" in e)) return "sem";
      if (e.habilidadesAnalisadas === 0) return "sem";
      const n = e.habilidadesAtencao;
      return n >= 5 ? "vermelho" : n >= 3 ? "amarelo" : n >= 1 ? "azul" : "verde";
    }
    case "evolucao": {
      if (e.tendencia === "SEM_COMPARACAO" || e.variacao === undefined || e.variacao === null) return "sem";
      if (e.tendencia === "QUEDA") return "vermelho";
      if (e.tendencia === "ESTAVEL") return "amarelo";
      return e.variacao >= crit.variacaoRelevante * 2 ? "verde" : "azul";
    }
    case "formacao": {
      const n = "formacao" in e ? e.formacao.professoresComDemanda : e.professoresComDemanda;
      return n >= 3 ? "vermelho" : n === 2 ? "amarelo" : n === 1 ? "azul" : "verde";
    }
  }
}
