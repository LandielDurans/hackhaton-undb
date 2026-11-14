"use client";
import { Fragment, useEffect, useMemo } from "react";
import Link from "next/link";
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { EscolaMapa, TerritorioMapa, Usuario } from "@/lib/types";
import { COR_FAIXA, faixaEscola, legendaCalor, type CamadaCalor } from "@/lib/calor";
import { num, pct, pp } from "@/lib/format";

export type Camada = "distribuicao" | "desempenho" | "dificuldades" | "evolucao" | "intervencoes" | "formacao";
export type Metrica = "acerto" | "adequado";

const CENTRO: [number, number] = [-2.545, -44.255];
const CALOR: Camada[] = ["desempenho", "dificuldades", "evolucao", "formacao"];
// Foco de calor: halos concêntricos em metros (escala junto com o zoom). Centrado em cada escola — não interpola território.
const HALOS: [number, number][] = [[1500, 0.08], [1100, 0.12], [750, 0.17], [420, 0.24], [200, 0.34]];

function Ajuste({ escolas, selecionada }: { escolas: EscolaMapa[]; selecionada?: string }) {
  const map = useMap();
  const chave = escolas.map(e => e.id).join(",");
  useEffect(() => {
    const sel = escolas.find(e => e.id === selecionada);
    if (sel) { map.flyTo([sel.lat, sel.lng], Math.max(map.getZoom(), 14), { duration: 0.6 }); return; }
    if (escolas.length > 0 && escolas.length < 18) {
      map.fitBounds(L.latLngBounds(escolas.map(e => [e.lat, e.lng] as [number, number])).pad(0.4), { maxZoom: 14 });
    } else map.setView(CENTRO, 12);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, selecionada]);
  return null;
}

export default function RedeMap({ escolas, territorios, camada, metrica, criterios, mostrarTerritorios, selecionada, usuario, altura = 560 }: {
  escolas: EscolaMapa[]; territorios: TerritorioMapa[]; camada: Camada; metrica: Metrica;
  criterios: { adequado: number; atencao: number; variacaoRelevante: number };
  mostrarTerritorios: boolean; selecionada?: string; usuario: Usuario; altura?: number;
}) {
  const icones = useMemo(() => new Map<string, L.DivIcon>(), []);
  const iconeContagem = (n: number, cor: string, sel: boolean) => {
    const k = `${n}|${cor}|${sel}`;
    if (!icones.has(k)) {
      const tam = 24 + Math.min(16, n * 2);
      icones.set(k, L.divIcon({
        className: "",
        html: `<div class="marcador-contagem" style="width:${tam}px;height:${tam}px;background:${cor};${sel ? "outline:3px solid #0f1b2d;outline-offset:1px" : ""}">${n}</div>`,
        iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2],
      }));
    }
    return icones.get(k)!;
  };
  const podeAbrir = (id: string) => usuario.papel === "GESTOR_REDE" || usuario.escolaId === id;
  const ehCalor = CALOR.includes(camada);
  const rotulos = ehCalor ? Object.fromEntries(legendaCalor(camada as CamadaCalor, criterios, metrica)) : {};

  return (
    <MapContainer center={CENTRO} zoom={12} minZoom={11} maxZoom={17} scrollWheelZoom style={{ height: altura, width: "100%" }}
      maxBounds={[[-2.75, -44.45], [-2.35, -44.0]]}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" className="tiles-suaves" />
      <Ajuste escolas={escolas} selecionada={selecionada} />

      {/* Focos de calor (atrás dos marcadores) */}
      {ehCalor && escolas.map(e => {
        const f = faixaEscola(e, camada as CamadaCalor, criterios, metrica);
        if (f === "sem") return null;
        return (
          <Fragment key={"calor-" + e.id}>
            {HALOS.map(([r, op]) => (
              <Circle key={r} center={[e.lat, e.lng]} radius={r} interactive={false}
                pathOptions={{ stroke: false, fillColor: COR_FAIXA[f], fillOpacity: op }} />
            ))}
          </Fragment>
        );
      })}

      {mostrarTerritorios && territorios.map(t => (
        <Marker key={t.id} position={[t.lat, t.lng]} interactive={false} keyboard={false}
          icon={L.divIcon({ className: "", iconSize: [0, 0], html: `<div style="transform:translate(-50%,-180%);white-space:nowrap" class="leaflet-tooltip rotulo-territorio">${t.nome}</div>` })} />
      ))}

      {escolas.map(e => {
        const sel = e.id === selecionada;
        const faixa = ehCalor ? faixaEscola(e, camada as CamadaCalor, criterios, metrica) : "sem";
        const cor = ehCalor ? COR_FAIXA[faixa] : camada === "intervencoes" ? (e.intervencoes.EM_ANDAMENTO > 0 ? "#17407a" : e.intervencoesTotal > 0 ? "#5598e7" : "#a3a8b0") : "#215a9c";
        const popup = (
          <Popup>
            <div className="min-w-[220px] text-[13px] leading-snug">
              <p className="font-semibold text-[14px] text-ink">{e.nome}</p>
              <p className="text-ink-3 text-xs">{e.bairro} · {e.territorioNome}</p>
              <div className="mt-2.5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[26px] font-bold font-display leading-none tabular">{e.indicador.suprimido ? "—" : pct(e.indicador.percentualAcerto)}</p>
                  <p className="text-[11px] text-ink-3 mt-0.5">de acerto · {num(e.avaliados)} avaliados</p>
                </div>
                {e.variacao !== undefined && e.variacao !== null && (
                  <span className={`text-[13px] font-semibold ${e.tendencia === "QUEDA" ? "text-[#dc2626]" : e.tendencia === "MELHORA" ? "text-[#2563eb]" : "text-ink-3"}`}>{pp(e.variacao)}</span>
                )}
              </div>
              {ehCalor && faixa !== "sem" && <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COR_FAIXA[faixa] }} />{rotulos[faixa]}</p>}
              {e.habilidadeCritica && <p className="mt-1.5 text-[12px] text-ink-2">Mais difícil: <strong>{e.habilidadeCritica.grupo}</strong> ({e.habilidadeCritica.id})</p>}
              {podeAbrir(e.id)
                ? <Link href={`/escolas/${e.id}`} className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-azulejo-700 px-3 py-2 text-[13px] font-medium !text-white hover:bg-azulejo-600">Abrir escola</Link>
                : <p className="mt-3 text-[11.5px] text-ink-3">Detalhes restritos à equipe da escola.</p>}
            </div>
          </Popup>
        );
        if (camada === "intervencoes") {
          return <Marker key={e.id} position={[e.lat, e.lng]} icon={iconeContagem(e.intervencoesTotal, cor, sel)} title={`${e.nome}: ${e.intervencoesTotal} planos`}>{popup}</Marker>;
        }
        const raio = camada === "distribuicao" ? 6 + Math.sqrt(e.matriculados) * 0.7 : 7;
        return (
          <CircleMarker key={e.id} center={[e.lat, e.lng]} radius={sel ? raio + 3 : raio}
            pathOptions={{ color: sel ? "#0f1b2d" : "#ffffff", weight: sel ? 3 : 2, fillColor: cor, fillOpacity: 1 }}>
            <Tooltip direction="top" offset={[0, -8]}>{e.nome}{ehCalor && faixa !== "sem" ? ` · ${rotulos[faixa]}` : ""}</Tooltip>
            {popup}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
