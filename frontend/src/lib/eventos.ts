import { STATUS_ROTULO } from "./format";

export function descreverEvento(h: { tipo: string; statusDe?: string; statusPara?: string; alteracoes?: string }) {
  const S = STATUS_ROTULO as Record<string, string>;
  switch (h.tipo) {
    case "CRIACAO": return "criou o plano";
    case "STATUS": return `alterou a situação: ${S[h.statusDe ?? ""] ?? "—"} → ${S[h.statusPara ?? ""] ?? "—"}`;
    case "REAVALIACAO": return `registrou a reavaliação (${h.alteracoes?.replace("Decisão: ", "") ?? ""})`;
    default: return h.alteracoes ?? "editou o plano";
  }
}
