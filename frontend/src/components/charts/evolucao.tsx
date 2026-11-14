"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { pct } from "@/lib/format";

/** Paleta categórica validada (slots 1–3, válidos em todos os pares). */
export const SERIES = ["#2071b7", "#39a6de", "#a8c048"];

export interface SerieEvolucao {
  nome: string;
  pontos: { sigla: string; valor?: number | null; detalhe?: string }[];
}

export function EvolucaoChart({ series, criterios, altura = 220, rotuloY = "% de acerto" }: {
  series: SerieEvolucao[]; criterios: { adequado: number; atencao: number }; altura?: number; rotuloY?: string;
}) {
  const siglas = series[0]?.pontos.map(p => p.sigla) ?? [];
  const data = siglas.map((s, i) => {
    const row: Record<string, string | number | null> = { sigla: s };
    series.forEach(se => { row[se.nome] = se.pontos[i]?.valor ?? null; });
    return row;
  });
  const multi = series.length > 1;
  return (
    <div>
      <div style={{ height: altura }} role="img" aria-label={`Evolução (${rotuloY}): ` + series.map(s => `${s.nome}: ${s.pontos.map(p => `${p.sigla} ${pct(p.valor)}`).join(", ")}`).join("; ")}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#ece7dc" vertical={false} />
            <XAxis dataKey="sigla" tick={{ fontSize: 12, fill: "#5b6675" }} axisLine={{ stroke: "#d3ccbc" }} tickLine={false} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: "#5b6675" }} axisLine={false} tickLine={false} unit="%" />
            <ReferenceLine y={criterios.adequado} stroke="#5e8c1f" strokeDasharray="4 4" />
            <ReferenceLine y={criterios.atencao} stroke="#c0462f" strokeDasharray="4 4" />
            <Tooltip
              formatter={(v) => (typeof v === "number" ? pct(v) : "sem dado")}
              contentStyle={{ borderRadius: 10, border: "1px solid #e4dfd3", fontSize: 12 }}
              cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
            />
            {multi && <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />}
            {series.map((s, i) => (
              <Line key={s.nome} type="linear" dataKey={s.nome} stroke={SERIES[i % SERIES.length]} strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 flex flex-wrap gap-x-4 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-adequado" aria-hidden />limiar adequado ({criterios.adequado}%)</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-atencao" aria-hidden />limiar de atenção ({criterios.atencao}%)</span>
      </p>
    </div>
  );
}
