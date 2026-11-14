"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Circle, GeoJSON, MapContainer, Marker, Pane, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection } from "geojson";
import type { EscolaAnalise, Usuario } from "@/lib/types";
import { COR_FAIXA, faixaAnalise, valorAnalise, type Analise } from "@/lib/analises";
import type { Faixa } from "@/lib/calor";

const CENTRO: [number, number] = [-2.545, -44.262];

/** Bairros rotulados no mapa (centróides do OpenStreetMap). */
const BAIRROS: { nome: string; pos: [number, number]; destaque?: boolean; desloc?: string }[] = [
  { nome: "CENTRO", pos: [-2.5318, -44.2985], destaque: true, desloc: "translate(-125%, -150%)" },
  { nome: "TURU", pos: [-2.5128, -44.2160], destaque: true },
  { nome: "ANJO DA GUARDA", pos: [-2.5545, -44.3355] },
  { nome: "COHAB", pos: [-2.5375, -44.2125] },
  { nome: "CIDADE OPERÁRIA", pos: [-2.5700, -44.1925] },
  { nome: "BEQUIMÃO", pos: [-2.5245, -44.2470] },
  { nome: "COROADINHO", pos: [-2.5675, -44.2690] },
  { nome: "RENASCENÇA", pos: [-2.5008, -44.2901] },
  { nome: "OLHO D'ÁGUA", pos: [-2.4800, -44.2290] },
  { nome: "JOÃO PAULO", pos: [-2.5490, -44.2790] },
];

/** Marcos de referência do esboço: rodoviária e aeroporto. */
const MARCOS: { nome: string; pos: [number, number]; svg: string }[] = [
  {
    nome: "Terminal Rodoviário", pos: [-2.5636, -44.2448],
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>',
  },
  {
    nome: "Aeroporto Marechal Cunha Machado", pos: [-2.5890, -44.2394],
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
  },
];

function cubo(cor: string, selecionada: boolean) {
  const t = selecionada ? 40 : 30;
  // cubo isométrico: topo claro, lateral esquerda na cor, lateral direita escurecida
  const svg = `<svg width="${t}" height="${t}" viewBox="0 0 30 30" class="cubo-escola${selecionada ? " selecionada" : ""}">
    <path d="M15 3 27 9 15 15 3 9Z" fill="color-mix(in srgb, ${cor} 45%, white)" stroke="#0d2b4a" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M3 9 15 15 15 28 3 22Z" fill="${cor}" stroke="#0d2b4a" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M27 9 15 15 15 28 27 22Z" fill="color-mix(in srgb, ${cor} 72%, black)" stroke="#0d2b4a" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${t}px;height:${t}px">${selecionada ? '<span class="pulso-escola"></span>' : ""}${svg}</div>`,
    iconSize: [t, t], iconAnchor: [t / 2, t * 0.7], popupAnchor: [0, -t * 0.6],
  });
}

function Foco({ escolas, selecionada }: { escolas: EscolaAnalise[]; selecionada?: string }) {
  const map = useMap();
  useEffect(() => {
    const sel = escolas.find(e => e.id === selecionada);
    if (sel) map.flyTo([sel.lat, sel.lng], Math.max(map.getZoom(), 14), { duration: 0.7 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada]);
  return null;
}

function RotulosPorZoom() {
  const map = useMap();
  const [z, setZ] = useState(map.getZoom());
  useEffect(() => {
    const h = () => setZ(map.getZoom());
    map.on("zoomend", h);
    return () => { map.off("zoomend", h); };
  }, [map]);
  return (
    <>
      {BAIRROS.filter(b => b.destaque || z >= 13).map(b => (
        <Marker key={b.nome} position={b.pos} interactive={false} keyboard={false}
          icon={L.divIcon({ className: "", iconSize: [0, 0], html: `<div class="rotulo-bairro" style="font-size:${b.destaque ? 13 : 10.5}px;${b.desloc ? `transform:${b.desloc}` : ""}">${b.nome}</div>` })} />
      ))}
    </>
  );
}

export default function MapaIlustrado({ escolas, analise, materia, criterios, selecionada, onSelecionar, usuario, detalhado, altura = 620 }: {
  escolas: EscolaAnalise[]; analise: Analise; materia: string; criterios: { adequado: number; atencao: number };
  selecionada?: string; onSelecionar: (id: string) => void; usuario: Usuario; detalhado: boolean; altura?: number;
}) {
  const [ilha, setIlha] = useState<FeatureCollection | null>(null);
  const [vias, setVias] = useState<FeatureCollection | null>(null);
  useEffect(() => {
    fetch("/geo/ilha.geojson").then(r => r.json()).then(setIlha).catch(() => setIlha(null));
    fetch("/geo/vias.geojson").then(r => r.json()).then(setVias).catch(() => setVias(null));
  }, []);
  const renderer = useMemo(() => L.canvas({ padding: 0.3, pane: "vias" }), []);
  const faixas = useMemo(() => new Map(escolas.map(e => [e.id, faixaAnalise(e, analise, criterios, materia)])), [escolas, analise, criterios, materia]);
  const podeAbrir = (id: string) => usuario.papel === "GESTOR_REDE" || usuario.escolaId === id;

  return (
    <MapContainer center={CENTRO} zoom={12} minZoom={11} maxZoom={17} scrollWheelZoom zoomSnap={0.5}
      className={detalhado ? "" : "mapa-ilustrado"} style={{ height: altura, width: "100%" }} maxBounds={[[-2.72, -44.42], [-2.40, -44.05]]}>
      {detalhado
        ? <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" className="tiles-suaves" />
        : <>
          {/* Camadas de base em panes abaixo dos focos de calor (o carregamento assíncrono não altera a ordem) */}
          <Pane name="ilha" style={{ zIndex: 330 }}>
            {ilha && <GeoJSON data={ilha} interactive={false} style={{ color: "#0d2b4a", weight: 2.2, fillColor: "#f5f2ea", fillOpacity: 1 }}
              attribution='Contorno e avenidas: &copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>' />}
          </Pane>
          <Pane name="vias" style={{ zIndex: 340 }}>
            {vias && <GeoJSON key="casco" data={vias} interactive={false} style={{ color: "#0d2b4a", weight: 4, opacity: 0.45, lineCap: "round", renderer }} />}
            {vias && <GeoJSON key="miolo" data={vias} interactive={false} style={{ color: "#f5f2ea", weight: 1.8, opacity: 1, lineCap: "round", renderer }} />}
          </Pane>
        </>}
      <Foco escolas={escolas} selecionada={selecionada} />

      {/* Focos de calor: halos centrados em cada escola (não interpolam área) */}
      {escolas.map(e => {
        const f = faixas.get(e.id) as Faixa;
        if (f === "sem") return null;
        return (
          <Fragment key={"calor-" + e.id}>
            {[[1500, 0.09], [1050, 0.13], [700, 0.18], [380, 0.26]].map(([r, op]) => (
              <Circle key={r} center={[e.lat, e.lng]} radius={r} interactive={false} pathOptions={{ stroke: false, fillColor: COR_FAIXA[f], fillOpacity: op }} />
            ))}
          </Fragment>
        );
      })}

      {!detalhado && <RotulosPorZoom />}
      {MARCOS.map(m => (
        <Marker key={m.nome} position={m.pos} keyboard={false}
          icon={L.divIcon({ className: "", iconSize: [44, 44], iconAnchor: [22, 22], html: `<div class="marco-mapa" title="${m.nome}">${m.svg}</div>` })}>
          <Tooltip direction="top" offset={[0, -18]}>{m.nome}</Tooltip>
        </Marker>
      ))}

      {escolas.map(e => {
        const f = faixas.get(e.id) as Faixa;
        const sel = e.id === selecionada;
        return (
          <Marker key={e.id} position={[e.lat, e.lng]} icon={cubo(COR_FAIXA[f], sel)} zIndexOffset={sel ? 1000 : 0}
            eventHandlers={{ click: () => onSelecionar(e.id) }} title={e.nome}>
            <Tooltip direction="top" offset={[0, -14]}>{e.nome} · {valorAnalise(e, analise, materia)}</Tooltip>
            <Popup>
              <div className="min-w-[210px] text-[13px]">
                <p className="font-semibold text-[14px]">{e.nome}</p>
                <p className="text-xs text-ink-3">{e.bairro} · escola fictícia</p>
                <p className="mt-2 inline-flex items-center gap-1.5 font-semibold"><span className="h-3 w-3 rounded-full" style={{ background: COR_FAIXA[f] }} />{valorAnalise(e, analise, materia)}</p>
                {podeAbrir(e.id)
                  ? <Link href={`/escolas/${e.id}`} className="mt-3 flex w-full items-center justify-center rounded-lg bg-azulejo-700 px-3 py-2 text-[13px] font-medium !text-white hover:bg-azulejo-600">Abrir escola</Link>
                  : <p className="mt-2 text-[11.5px] text-ink-3">Detalhes restritos à equipe da escola.</p>}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
