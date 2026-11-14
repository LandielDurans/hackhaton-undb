"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Histograma de estudantes por faixa de percentual de acerto. */
export function DistribuicaoChart({ faixas, criterios, altura = 180 }: {
  faixas: { faixa: string; estudantes: number }[]; criterios: { adequado: number; atencao: number }; altura?: number;
}) {
  const cor = (i: number) => {
    const meio = i * 20 + 10;
    return meio >= criterios.adequado ? "#7fa52f" : meio >= criterios.atencao ? "#e0aa12" : "#d9573f";
  };
  return (
    <div style={{ height: altura }} role="img" aria-label={"Distribuição de estudantes: " + faixas.map(f => `${f.faixa}: ${f.estudantes}`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={faixas} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barCategoryGap={2}>
          <CartesianGrid stroke="#ece7dc" vertical={false} />
          <XAxis dataKey="faixa" tick={{ fontSize: 11, fill: "#5b6675" }} tickLine={false} axisLine={{ stroke: "#d3ccbc" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5b6675" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`${v} estudantes`, "Quantidade"]} contentStyle={{ borderRadius: 10, border: "1px solid #e4dfd3", fontSize: 12 }} cursor={{ fill: "#eef5fb" }} />
          <Bar dataKey="estudantes" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {faixas.map((_, i) => <Cell key={i} fill={cor(i)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
