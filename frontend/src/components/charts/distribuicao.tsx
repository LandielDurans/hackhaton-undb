"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Histograma de estudantes por faixa de percentual de acerto. */
export function DistribuicaoChart({ faixas, criterios, altura = 180 }: {
  faixas: { faixa: string; estudantes: number }[]; criterios: { adequado: number; atencao: number }; altura?: number;
}) {
  const cor = (i: number) => {
    const meio = i * 20 + 10;
    return meio >= criterios.adequado ? "#1f8a70" : meio >= criterios.atencao ? "#c98a0b" : "#c2410c";
  };
  return (
    <div style={{ height: altura }} role="img" aria-label={"Distribuição de estudantes: " + faixas.map(f => `${f.faixa}: ${f.estudantes}`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={faixas} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap={2}>
          <CartesianGrid stroke="#e8ecf1" vertical={false} />
          <XAxis dataKey="faixa" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cfd7e2" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`${v} estudantes`, "Quantidade"]} contentStyle={{ borderRadius: 10, border: "1px solid #e2e7ee", fontSize: 12 }} cursor={{ fill: "#eef4fb" }} />
          <Bar dataKey="estudantes" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {faixas.map((_, i) => <Cell key={i} fill={cor(i)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
