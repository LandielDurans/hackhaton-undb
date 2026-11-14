"use client";
import { useEffect, useMemo, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection } from "geojson";
import type { EscolaAnalise } from "@/lib/types";
import { corRgbGradiente } from "@/lib/analises";
import type { Porte } from "@/lib/icones-escola";

interface ViaSegmento {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
  midLat: number;
  midLng: number;
  cosT: number;
  sinT: number;
}

interface EscolaCampo {
  e: EscolaAnalise;
  rgb: [number, number, number];
  cosT: number;
  sinT: number;
  temVia: boolean;
  fatorPorte: number;
}

const FATOR_PORTE: Record<Porte, number> = {
  PEQUENA: 0.9,
  MEDIA: 1.15,
  GRANDE: 1.4,
};

/** Extrai segmentos de vias principais/secundárias para orientar o fluxo do calor. */
function extrairSegmentosVias(vias?: FeatureCollection): ViaSegmento[] {
  if (!vias) return [];
  const segs: ViaSegmento[] = [];

  for (const f of vias.features) {
    const cls = f.properties?.c ?? 3;
    if (cls > 2) continue; // apenas vias arteriais/principais e secundárias
    const g = f.geometry;
    const linhas: number[][][] =
      g.type === "LineString"
        ? [g.coordinates as number[][]]
        : g.type === "MultiLineString"
        ? (g.coordinates as number[][][])
        : [];

    for (const linha of linhas) {
      for (let i = 0; i < linha.length - 1; i++) {
        const [lng1, lat1] = linha[i];
        const [lng2, lat2] = linha[i + 1];
        const dx = lng2 - lng1;
        const dy = lat2 - lat1;
        const len = Math.hypot(dx, dy);
        if (len < 1e-5) continue;
        segs.push({
          lat1,
          lng1,
          lat2,
          lng2,
          midLat: (lat1 + lat2) * 0.5,
          midLng: (lng1 + lng2) * 0.5,
          cosT: dx / len,
          sinT: -dy / len, // y na tela cresce para baixo (sul)
        });
      }
    }
  }
  return segs;
}

/** Aplica clipping do polígono da Ilha de São Luís para que o fluido nunca vaze no mar. */
function aplicarClipIlha(ctx: CanvasRenderingContext2D, map: L.Map, ilha?: FeatureCollection) {
  if (!ilha) return;
  ctx.beginPath();
  for (const f of ilha.features) {
    const g = f.geometry;
    const polys: number[][][][] =
      g.type === "Polygon"
        ? [g.coordinates as number[][][]]
        : g.type === "MultiPolygon"
        ? (g.coordinates as number[][][][])
        : [];

    for (const poly of polys) {
      for (const ring of poly) {
        for (let i = 0; i < ring.length; i++) {
          const [lng, lat] = ring[i];
          const pt = map.latLngToContainerPoint([lat, lng]);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
      }
    }
  }
  ctx.clip("evenodd");
}

export function CalorFluido({
  escolas,
  scores,
  ilha,
  vias,
}: {
  escolas: EscolaAnalise[];
  scores: Map<string, number | null>;
  ilha?: FeatureCollection;
  vias?: FeatureCollection;
}) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const segmentos = useMemo(() => extrairSegmentosVias(vias), [vias]);

  // Pré-calcula cor e orientação viária de cada escola
  const campos = useMemo<EscolaCampo[]>(() => {
    return escolas.map(e => {
      const score = scores.get(e.id) ?? null;
      const rgb = corRgbGradiente(score);
      const porte = (e.porte ?? "PEQUENA") as Porte;

      // Busca via mais próxima até ~700m (0.0065 graus)
      let melhorD2 = 0.0065 * 0.0065;
      let cosT = 1;
      let sinT = 0;
      let temVia = false;

      for (const s of segmentos) {
        const dLat = e.lat - s.midLat;
        const dLng = e.lng - s.midLng;
        const d2 = dLat * dLat + dLng * dLng;
        if (d2 < melhorD2) {
          melhorD2 = d2;
          cosT = s.cosT;
          sinT = s.sinT;
          temVia = true;
        }
      }

      return {
        e,
        rgb,
        cosT,
        sinT,
        temVia,
        fatorPorte: FATOR_PORTE[porte],
      };
    });
  }, [escolas, scores, segmentos]);

  // Cria o elemento canvas dentro do pane dedicado do Leaflet
  useEffect(() => {
    let pane = map.getPane("calorFluido");
    if (!pane) {
      pane = map.createPane("calorFluido");
      pane.style.zIndex = "350"; // acima das vias (340), abaixo dos marcadores (600)
      pane.style.pointerEvents = "none";
    }

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    pane.appendChild(canvas);
    canvasRef.current = canvas;
    offscreenRef.current = document.createElement("canvas");

    return () => {
      canvas.remove();
      canvasRef.current = null;
      offscreenRef.current = null;
    };
  }, [map]);

  const desenhar = () => {
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    if (!canvas || !off) return;

    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;

    // Alinha o canvas ao canto superior esquerdo do viewport atual no pane
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    if (canvas.width !== size.x || canvas.height !== size.y) {
      canvas.width = size.x;
      canvas.height = size.y;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size.x, size.y);
    if (campos.length === 0) return;

    // Grade offscreen 4x menor para renderização fluida em tempo real
    const STEP = 4;
    const gw = Math.ceil(size.x / STEP);
    const gh = Math.ceil(size.y / STEP);

    if (off.width !== gw || off.height !== gh) {
      off.width = gw;
      off.height = gh;
    }

    const octx = off.getContext("2d");
    if (!octx) return;

    const z = map.getZoom();
    // Raio base em pixels cresce com o zoom para manter cobertura territorial realista
    const raioBasePx = Math.max(30, Math.min(135, 38 * Math.pow(1.42, z - 12)));

    // Projeta apenas escolas visíveis (com margem)
    const margem = raioBasePx * 1.8;
    const visiveis = campos
      .map(c => {
        const pt = map.latLngToContainerPoint([c.e.lat, c.e.lng]);
        return { ...c, px: pt.x, py: pt.y, raio: raioBasePx * c.fatorPorte };
      })
      .filter(
        c =>
          c.px >= -margem &&
          c.px <= size.x + margem &&
          c.py >= -margem &&
          c.py <= size.y + margem
      );

    const img = octx.createImageData(gw, gh);
    const data = img.data;

    if (visiveis.length > 0) {
      for (let gy = 0; gy < gh; gy++) {
        const py = gy * STEP + STEP * 0.5;
        for (let gx = 0; gx < gw; gx++) {
          const px = gx * STEP + STEP * 0.5;

          let maxW = 0;
          let secondW = 0;
          let sumW = 0;
          let domRgb: [number, number, number] | null = null;
          let secondRgb: [number, number, number] | null = null;

          for (let i = 0; i < visiveis.length; i++) {
            const c = visiveis[i];
            const dx = px - c.px;
            const dy = py - c.py;
            const maxR = c.raio * 1.45;
            if (Math.abs(dx) > maxR || Math.abs(dy) > maxR) continue;

            let distNorm: number;
            if (c.temVia) {
              // Projeta na direção da via principal (alongado 1.38x na via, 0.78x perpendicular)
              const along = dx * c.cosT + dy * c.sinT;
              const perp = -dx * c.sinT + dy * c.cosT;
              const u = along / (c.raio * 1.38);
              const v = perp / (c.raio * 0.78);
              distNorm = Math.sqrt(u * u + v * v);
            } else {
              distNorm = Math.hypot(dx, dy) / c.raio;
            }

            if (distNorm >= 1) continue;

            // Kernel cúbico suave (metaball) com queda natural nas bordas
            const t = 1 - distNorm;
            const w = t * t * (3 - 2 * t);

            sumW += w;
            if (w > maxW) {
              secondW = maxW;
              secondRgb = domRgb;
              maxW = w;
              domRgb = c.rgb;
            } else if (w > secondW) {
              secondW = w;
              secondRgb = c.rgb;
            }
          }

          if (!domRgb || sumW <= 0.02) continue;

          // Transição comum sem criar cores falsas:
          // A cor dominante prevalece; se outra escola de cor diferente encosta na fronteira (secondW ~ maxW),
          // suaviza a opacidade na divisa quando as cores são muito distantes para não gerar cor artificial.
          let fatorFronteira = 1;
          if (secondRgb && secondW > 0.05) {
            const diffCor =
              Math.abs(domRgb[0] - secondRgb[0]) +
              Math.abs(domRgb[1] - secondRgb[1]) +
              Math.abs(domRgb[2] - secondRgb[2]);
            if (diffCor > 140) {
              // Na zona de encontro entre cores opostas (ex: vermelho vs verde), reduz levemente a intensidade
              // na linha exata de fronteira (transição por opacidade, sem inventar amarelo).
              const razao = secondW / maxW; // 0 .. 1
              fatorFronteira = 1 - razao * 0.55;
            }
          }

          const intensidade = Math.min(1, sumW * 0.85) * fatorFronteira;
          const alpha = Math.round(intensidade * 155); // máximo ~0.61 de opacidade

          const idx = (gy * gw + gx) * 4;
          data[idx] = domRgb[0];
          data[idx + 1] = domRgb[1];
          data[idx + 2] = domRgb[2];
          data[idx + 3] = alpha;
        }
      }
    }

    octx.putImageData(img, 0, 0);

    // Desenha no canvas principal recortado pela Ilha e com suavização fluida
    ctx.save();
    aplicarClipIlha(ctx, map, ilha);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.filter = "blur(6px)";
    ctx.drawImage(off, 0, 0, size.x, size.y);
    ctx.restore();
  };

  useEffect(() => {
    desenhar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campos, ilha]);

  useMapEvents({
    move: desenhar,
    zoom: desenhar,
    resize: desenhar,
    viewreset: desenhar,
  });

  return null;
}
