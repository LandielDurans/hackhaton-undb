"use client";
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleMarker, GeoJSON, MapContainer, Marker, Pane, Popup, ScaleControl, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { EscolaAnalise, Usuario } from "@/lib/types";
import { COR_FAIXA, faixaAnalise, valorAnalise, type Analise } from "@/lib/analises";
import type { Faixa } from "@/lib/calor";
import { iconeEscola, PORTE_ROTULO, type Porte } from "@/lib/icones-escola";

const CENTRO: [number, number] = [-2.545, -44.262];
const TINTA = "#0d2b4a";      // traço "caneta" do esboço
const PAPEL = "#f5f2ea";

/** Bairros sempre rotulados (como no esboço) e demais a partir do zoom 13. */
const BAIRROS_FIXOS: { nome: string; pos: [number, number]; destaque?: boolean; desloc?: string }[] = [
  { nome: "CENTRO", pos: [-2.5318, -44.2985], destaque: true, desloc: "translate(-165%, -260%)" },
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

/** Nomes de águas (posições calculadas a partir dos polígonos do OpenStreetMap). */
const AGUAS: { nome: string; pos: [number, number]; tam: number; ang?: number; zoom: number }[] = [
  { nome: "OCEANO ATLÂNTICO", pos: [-2.4700, -44.2550], tam: 15, zoom: 11 },
  { nome: "BAÍA DE SÃO MARCOS", pos: [-2.5350, -44.3620], tam: 13, ang: -62, zoom: 11 },
  { nome: "Rio Anil", pos: [-2.5217, -44.2939], tam: 11, ang: -20, zoom: 12.5 },
  { nome: "Rio Bacanga", pos: [-2.5615, -44.2936], tam: 11, ang: -60, zoom: 12.5 },
  { nome: "Lagoa da Jansen", pos: [-2.4989, -44.3007], tam: 10, zoom: 13.5 },
  { nome: "Represa do Batatã", pos: [-2.5993, -44.2635], tam: 10, zoom: 13 },
];

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

type Camadas = Partial<Record<"ilha" | "agua" | "mangue" | "verde" | "praia" | "rios" | "vias" | "aeroporto", FeatureCollection>>;
type RotuloVia = { nome: string; lat: number; lng: number; ang: number };
type Bairro = { nome: string; lat: number; lng: number; tipo: string };

function useCamadas() {
  const [c, setC] = useState<Camadas>({});
  const [rotulosVias, setRotulosVias] = useState<RotuloVia[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  useEffect(() => {
    (["ilha", "agua", "mangue", "verde", "praia", "rios", "vias", "aeroporto"] as const).forEach(k =>
      fetch(`/geo/${k}.geojson`).then(r => (r.ok ? r.json() : null)).then(d => d && setC(p => ({ ...p, [k]: d }))).catch(() => undefined));
    fetch("/geo/rotulos-vias.json").then(r => (r.ok ? r.json() : [])).then(setRotulosVias).catch(() => undefined);
    fetch("/geo/bairros.json").then(r => (r.ok ? r.json() : [])).then(setBairros).catch(() => undefined);
  }, []);
  return { c, rotulosVias, bairros };
}

function useZoom() {
  const map = useMap();
  const [z, setZ] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZ(map.getZoom()) });
  return z;
}

function iconeLeaflet(porte: Porte, cor: string, selecionada: boolean) {
  const ic = iconeEscola(porte, cor, selecionada);
  const [ax, ay] = ic.ancora;
  const pulso = selecionada ? `<span class="pulso-escola" style="left:${ax - 22}px;top:${ay - 10}px"></span>` : "";
  return L.divIcon({
    className: "",
    html: `<div class="marcador-escola" style="position:relative;width:${ic.largura}px;height:${ic.altura}px">${pulso}${ic.html}</div>`,
    iconSize: [ic.largura, ic.altura], iconAnchor: [ax, ay], popupAnchor: [0, -ic.altura * 0.75], tooltipAnchor: [0, -ic.altura * 0.6],
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

/** Larguras das vias por classe e zoom (avenidas > secundárias > terciárias). */
function larguras(z: number) {
  const k = Math.max(0.7, Math.min(2.2, 1 + (z - 12) * 0.45));
  return {
    1: { casco: 5.2 * k, miolo: 3 * k },
    2: { casco: 3.4 * k, miolo: 1.8 * k },
    3: { casco: z >= 13 ? 2.2 * k : 0, miolo: z >= 12.5 ? 1 * k : 0.6 },
  } as Record<number, { casco: number; miolo: number }>;
}

/** Cartografia de base no estilo do esboço: tinta azul-marinho sobre papel. */
function Cartografia({ c, rotulosVias, bairros }: { c: Camadas; rotulosVias: RotuloVia[]; bairros: Bairro[] }) {
  const z = useZoom();
  const canvasVias = useMemo(() => L.canvas({ padding: 0.4, pane: "vias" }), []);
  const canvasRios = useMemo(() => L.canvas({ padding: 0.4, pane: "rios" }), []);
  const lw = larguras(z);
  const zb = Math.round(z * 2) / 2; // reestiliza por faixa de zoom
  const fixos = new Set(BAIRROS_FIXOS.map(b => b.nome.toLowerCase()));
  const extras = bairros.filter(b => b.tipo === "suburb" && !fixos.has(b.nome.toLowerCase()));

  return (
    <>
      <Pane name="ilha" style={{ zIndex: 320 }}>
        {c.ilha && <GeoJSON data={c.ilha} interactive={false} style={{ color: TINTA, weight: 2.4, fillColor: PAPEL, fillOpacity: 1, className: "traco-mao" }}
          attribution='Cartografia: &copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>' />}
      </Pane>
      <Pane name="verde" style={{ zIndex: 324 }}>
        {c.verde && <GeoJSON data={c.verde} interactive={false}
          style={(f?: Feature) => ({ stroke: z >= 13, color: "#5f8f52", weight: 0.8, opacity: 0.6, fillColor: "#dcebd3", fillOpacity: 1, className: f?.properties?.tipo === "mata" ? "fill-mata" : "fill-parque" })} />}
        {c.praia && <GeoJSON data={c.praia} interactive={false} style={{ color: "#c9a85d", weight: 0.8, fillColor: "#f4e6c3", fillOpacity: 1, className: "fill-areia" }} />}
      </Pane>
      <Pane name="aero" style={{ zIndex: 326 }}>
        {c.aeroporto && <GeoJSON key={"aero" + zb} data={c.aeroporto} interactive={false}
          style={(f?: Feature) => f?.properties?.tipo === "aerodrome"
            ? { color: TINTA, weight: 1, dashArray: "4 4", fillColor: "#e9e7e0", fillOpacity: 1 }
            : f?.properties?.tipo === "runway" ? { color: "#3a3f4b", weight: z >= 13 ? 9 : 6, lineCap: "butt" } : { color: "#8b909c", weight: z >= 13 ? 3 : 2 }} />}
        {c.aeroporto && z >= 13 && <GeoJSON key={"pista" + zb} data={{ type: "FeatureCollection", features: c.aeroporto.features.filter(f => f.properties?.tipo === "runway") } as FeatureCollection} interactive={false}
          style={{ color: "#ffffff", weight: 1.2, dashArray: "8 8", lineCap: "butt" }} />}
      </Pane>
      <Pane name="mangue" style={{ zIndex: 328 }}>
        {c.mangue && <GeoJSON data={c.mangue} interactive={false} style={{ color: TINTA, weight: 1, opacity: 0.5, fillColor: "#e7efe0", fillOpacity: 1, className: "fill-mangue" }} />}
      </Pane>
      <Pane name="agua" style={{ zIndex: 330 }}>
        {c.agua && <GeoJSON data={c.agua} interactive={false} style={{ color: TINTA, weight: 1.6, fillColor: "#e8f1f8", fillOpacity: 1, className: "fill-agua" }} />}
      </Pane>
      <Pane name="rios" style={{ zIndex: 332 }}>
        {c.rios && <GeoJSON key={"rios" + zb} data={c.rios} interactive={false}
          style={(f?: Feature) => ({ color: "#4f6fae", weight: f?.properties?.tipo === "river" ? 2.2 : z >= 13 ? 1.2 : 0.7, opacity: 0.8, renderer: canvasRios })} />}
      </Pane>
      <Pane name="vias" style={{ zIndex: 340 }}>
        {/* contorno de todas as vias primeiro, preenchimento depois: cruzamentos limpos como em mapa impresso */}
        {c.vias && <GeoJSON key={"casco" + zb} data={c.vias} interactive={false}
          style={(f?: Feature) => { const w = lw[f?.properties?.c ?? 3]; return { color: TINTA, weight: w.casco, opacity: w.casco ? 0.85 : 0, lineCap: "round", lineJoin: "round", renderer: canvasVias }; }} />}
        {c.vias && <GeoJSON key={"miolo" + zb} data={c.vias} interactive={false}
          style={(f?: Feature) => { const cl = f?.properties?.c ?? 3; const w = lw[cl]; return { color: cl === 1 ? "#fff6d6" : cl === 2 ? "#ffffff" : (w.casco ? "#ffffff" : "#8892a8"), weight: w.miolo, opacity: 1, lineCap: "round", lineJoin: "round", renderer: canvasVias }; }} />}
      </Pane>

      {/* Rótulos */}
      {AGUAS.filter(a => z >= a.zoom).map(a => (
        <Marker key={a.nome} position={a.pos} interactive={false} keyboard={false}
          icon={L.divIcon({ className: "", iconSize: [0, 0], html: `<div class="rotulo-agua" style="font-size:${a.tam}px;transform:translate(-50%,-50%) rotate(${a.ang ?? 0}deg)">${a.nome}</div>` })} />
      ))}
      {z >= 13.5 && rotulosVias.map(r => (
        <Marker key={r.nome + r.lat} position={[r.lat, r.lng]} interactive={false} keyboard={false}
          icon={L.divIcon({ className: "", iconSize: [0, 0], html: `<div class="rotulo-via" style="transform:translate(-50%,-50%) rotate(${r.ang}deg)">${r.nome}</div>` })} />
      ))}
      {BAIRROS_FIXOS.filter(b => b.destaque || z >= 12.5).map(b => (
        <Marker key={b.nome} position={b.pos} interactive={false} keyboard={false}
          icon={L.divIcon({ className: "", iconSize: [0, 0], html: `<div class="rotulo-bairro" style="font-size:${b.destaque ? 13 : 10.5}px;${b.desloc ? `transform:${b.desloc}` : ""}">${b.nome}</div>` })} />
      ))}
      {z >= 14 && extras.map(b => (
        <Marker key={b.nome + b.lat} position={[b.lat, b.lng]} interactive={false} keyboard={false}
          icon={L.divIcon({ className: "", iconSize: [0, 0], html: `<div class="rotulo-bairro" style="font-size:9.5px;opacity:.8">${b.nome.toUpperCase()}</div>` })} />
      ))}
    </>
  );
}

/** Padrões de preenchimento (hachuras) usados via CSS nas camadas vetoriais. */
function PadroesSvg() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <pattern id="hachura-agua" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="#e8f1f8" /><line x1="0" y1="0" x2="0" y2="12" stroke="#2071b7" strokeOpacity="0.28" strokeWidth="1.6" />
        </pattern>
        <pattern id="zigue-mangue" width="10" height="8" patternUnits="userSpaceOnUse">
          <rect width="10" height="8" fill="#e5efdc" /><path d="M0 6 L2.5 1.5 L5 6 L7.5 1.5 L10 6" fill="none" stroke="#0d2b4a" strokeOpacity="0.55" strokeWidth="1" />
        </pattern>
        <pattern id="pontos-mata" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="#d6e7cc" /><circle cx="2.5" cy="2.5" r="1.3" fill="#4f7f43" fillOpacity="0.55" /><circle cx="7" cy="6.8" r="1.1" fill="#4f7f43" fillOpacity="0.45" />
        </pattern>
        <pattern id="pontos-parque" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="#e1eed9" /><circle cx="4" cy="4" r="0.9" fill="#4f7f43" fillOpacity="0.4" />
        </pattern>
        <pattern id="pontos-areia" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#f4e6c3" /><circle cx="1.5" cy="1.5" r="0.6" fill="#b48f3e" fillOpacity="0.5" /><circle cx="4.5" cy="4.2" r="0.5" fill="#b48f3e" fillOpacity="0.4" />
        </pattern>
      </defs>
    </svg>
  );
}

export default function MapaIlustrado({ escolas, analise, materia, criterios, selecionada, onSelecionar, usuario, detalhado, altura = 620 }: {
  escolas: EscolaAnalise[]; analise: Analise; materia: string; criterios: { adequado: number; atencao: number };
  selecionada?: string; onSelecionar: (id: string) => void; usuario: Usuario; detalhado: boolean; altura?: number;
}) {
  const { c, rotulosVias, bairros } = useCamadas();
  const faixas = useMemo(() => new Map(escolas.map(e => [e.id, faixaAnalise(e, analise, criterios, materia)])), [escolas, analise, criterios, materia]);
  const podeAbrir = (id: string) => usuario.papel === "GESTOR_REDE" || usuario.escolaId === id;

  return (
    <>
      <PadroesSvg />
      <MapContainer center={CENTRO} zoom={12} minZoom={11} maxZoom={17} scrollWheelZoom zoomSnap={0.5}
        className={detalhado ? "" : "mapa-ilustrado"} style={{ height: altura, width: "100%" }} maxBounds={[[-2.72, -44.42], [-2.40, -44.05]]}>
        {detalhado
          ? <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" className="tiles-suaves" />
          : <Cartografia c={c} rotulosVias={rotulosVias} bairros={bairros} />}
        <Foco escolas={escolas} selecionada={selecionada} />
        <ScaleControl position="bottomright" imperial={false} />

        {/* Focos de calor: halos centrados em cada escola (não interpolam área) */}
        {escolas.map(e => {
          const f = faixas.get(e.id) as Faixa;
          if (f === "sem") return null;
          return (
            <Fragment key={"calor-" + e.id}>
              {/* raios em pixels: o foco mantém o mesmo tamanho na tela em qualquer zoom */}
              {[[42, 0.09], [31, 0.13], [21, 0.18], [12, 0.26]].map(([r, op]) => (
                <CircleMarker key={r} center={[e.lat, e.lng]} radius={r} interactive={false} pathOptions={{ stroke: false, fillColor: COR_FAIXA[f], fillOpacity: op }} />
              ))}
            </Fragment>
          );
        })}

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
            <Marker key={e.id} position={[e.lat, e.lng]} icon={iconeLeaflet(e.porte, COR_FAIXA[f], sel)} zIndexOffset={sel ? 1000 : 0}
              eventHandlers={{ click: () => onSelecionar(e.id) }} title={e.nome}>
              <Tooltip direction="top">{e.nome} · {valorAnalise(e, analise, materia)}</Tooltip>
              <Popup>
                <div className="min-w-[210px] text-[13px]">
                  <p className="font-semibold text-[14px]">{e.nome}</p>
                  <p className="text-xs text-ink-3">{e.bairro} · {PORTE_ROTULO[e.porte].split(" · ")[0].toLowerCase()} ({e.matriculasEscola.toLocaleString("pt-BR")} estudantes) · fictícia</p>
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
      {!detalhado && (
        <svg className="pointer-events-none absolute bottom-12 right-4 z-[450] h-16 w-16 drop-shadow" viewBox="0 0 64 64" aria-label="Norte">
          <circle cx="32" cy="34" r="20" fill="#f5f2ea" stroke="#0d2b4a" strokeWidth="1.6" />
          <path d="M32 14 38 34 32 31 26 34Z" fill="#d9573f" stroke="#0d2b4a" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M32 54 26 34 32 37 38 34Z" fill="#f5f2ea" stroke="#0d2b4a" strokeWidth="1.2" strokeLinejoin="round" />
          <text x="32" y="10" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0d2b4a" fontFamily="sans-serif">N</text>
        </svg>
      )}
    </>
  );
}
