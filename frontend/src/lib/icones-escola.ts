/**
 * Ícones isométricos das escolas em proporções reais de área de chão:
 * - PEQUENA (< 200 alunos): 1x1 no chão (1 andar)
 * - MEDIA (200 a 450 alunos): 2x1 no chão (dobro da área de P, 1 andar + telhado)
 * - GRANDE (> 450 alunos): 2x1 no chão (mesma área de M, porém com 2º andar + telhado)
 */
export type Porte = "PEQUENA" | "MEDIA" | "GRANDE";

export const PORTE_ROTULO: Record<Porte, string> = {
  PEQUENA: "Pequena · menos de 200 estudantes",
  MEDIA: "Média · 200 a 450 estudantes",
  GRANDE: "Grande · mais de 450 estudantes",
};

const TINTA = "#3f3f46";
type P3 = [number, number, number];

/** Projeção isométrica: x desce para a direita, y desce para a esquerda, z sobe. */
function iso([x, y, z]: P3): [number, number] {
  return [(x - y) * 0.866, (x + y) * 0.5 - z];
}

function claro(cor: string, pct: number) {
  return `color-mix(in srgb, ${cor} ${pct}%, white)`;
}
function escuro(cor: string, pct: number) {
  return `color-mix(in srgb, ${cor} ${pct}%, black)`;
}

class Desenho {
  faces: { pts: P3[]; fill: string; stroke?: string; sw?: number; op?: number }[] = [];
  linhas: { a: P3; b: P3; cor: string; sw: number }[] = [];

  face(pts: P3[], fill: string, sw = 1.2, stroke = TINTA, op = 1) {
    this.faces.push({ pts, fill, stroke, sw, op });
  }
  linha(a: P3, b: P3, cor = TINTA, sw = 1.1) {
    this.linhas.push({ a, b, cor, sw });
  }

  /** Caixa com as três faces visíveis (frente +y, lado +x, topo opcional). */
  caixa(x0: number, y0: number, z0: number, w: number, d: number, h: number, cor: string, topo = true) {
    const x1 = x0 + w;
    const y1 = y0 + d;
    const z1 = z0 + h;
    this.face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], cor);
    this.face([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], escuro(cor, 74));
    if (topo) {
      this.face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], claro(cor, 48));
    }
  }

  /** Telhado de duas águas com cumeeira ao longo do eixo Y (empena voltada para +y) ou X (empena para +x). */
  telhado(x0: number, y0: number, zBase: number, w: number, d: number, hPico: number, cor: string, eixoCumeeira: "x" | "y") {
    const x1 = x0 + w;
    const y1 = y0 + d;
    const zp = zBase + hPico;

    if (eixoCumeeira === "y") {
      // Cumeeira ao longo de Y (de y0 a y1), empena triangular voltada para a frente (+y)
      const xm = x0 + w * 0.5;
      // Água esquerda (voltada para cima/esquerda)
      this.face([[x0, y0, zBase], [xm, y0, zp], [xm, y1, zp], [x0, y1, zBase]], claro(cor, 45));
      // Água direita (voltada para +x)
      this.face([[xm, y0, zp], [x1, y0, zBase], [x1, y1, zBase], [xm, y1, zp]], escuro(cor, 78));
      // Empena frontal (+y)
      this.face([[x0, y1, zBase], [x1, y1, zBase], [xm, y1, zp]], cor);
    } else {
      // Cumeeira ao longo de X (de x0 a x1), empena triangular voltada para +x
      const ym = y0 + d * 0.5;
      // Água traseira
      this.face([[x0, y0, zBase], [x1, y0, zBase], [x1, ym, zp], [x0, ym, zp]], claro(cor, 42));
      // Água frontal
      this.face([[x0, ym, zp], [x1, ym, zp], [x1, y1, zBase], [x0, y1, zBase]], claro(cor, 70));
      // Empena lateral (+x)
      this.face([[x1, y0, zBase], [x1, y1, zBase], [x1, ym, zp]], escuro(cor, 74));
    }
  }

  svg(escala: number, extraClasse = "") {
    const todos = [...this.faces.flatMap(f => f.pts), ...this.linhas.flatMap(l => [l.a, l.b])].map(iso);
    const xs = todos.map(p => p[0]);
    const ys = todos.map(p => p[1]);
    const pad = 2;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) + pad - minX;
    const h = Math.max(...ys) + pad - minY;
    const pt = (p: P3) => {
      const [a, b] = iso(p);
      return `${(a - minX).toFixed(2)},${(b - minY).toFixed(2)}`;
    };
    const corpo = [
      ...this.faces.map(
        f =>
          `<polygon points="${f.pts.map(pt).join(" ")}" fill="${f.fill}" stroke="${f.stroke}" stroke-width="${f.sw}" stroke-linejoin="round"${
            f.op !== 1 ? ` opacity="${f.op}"` : ""
          }/>`
      ),
      ...this.linhas.map(
        l =>
          `<line x1="${pt(l.a).split(",")[0]}" y1="${pt(l.a).split(",")[1]}" x2="${pt(l.b).split(",")[0]}" y2="${
            pt(l.b).split(",")[1]
          }" stroke="${l.cor}" stroke-width="${l.sw}" stroke-linecap="round"/>`
      ),
    ].join("");
    const largura = w * escala;
    const altura = h * escala;
    return {
      svg: `<svg width="${largura.toFixed(1)}" height="${altura.toFixed(1)}" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(
        2
      )}" class="${extraClasse}">${corpo}</svg>`,
      largura,
      altura,
    };
  }
}

const U = 9; // unidade base de 1 célula de chão (1x1)

interface PecaAlocada {
  gx: number;
  gy: number;
  gw: number; // células em X (1 ou 2)
  gd: number; // células em Y (1 ou 2)
  porte: Porte;
  cor: string;
}

/** Desenha uma escola respeitando suas dimensões reais em células (1x1, 2x1 ou 1x2). */
function desenharPeca(d: Desenho, p: PecaAlocada) {
  const x0 = p.gx * U;
  const y0 = p.gy * U;
  const w = p.gw * U;
  const dLen = p.gd * U;

  if (p.porte === "PEQUENA") {
    // P: 1x1 no chão, 1 andar
    d.caixa(x0, y0, 0, U, U, 7.5, p.cor, true);
    return;
  }

  if (p.porte === "MEDIA") {
    // M: 2x1 (ou 1x2) no chão (dobro de área de P), 1 andar + telhado de duas águas
    d.caixa(x0, y0, 0, w, dLen, 6, p.cor, false);
    const eixo = p.gw >= p.gd ? "y" : "x";
    d.telhado(x0, y0, 6, w, dLen, 4.2, p.cor, eixo);
    return;
  }

  // GRANDE (G): mesma área de chão que M (2 células), porém com 2º andar na metade traseira
  if (p.gw >= p.gd) {
    // Orientado em 2x1 ao longo de X: bloco esquerdo/traseiro (gx) sobe 2º andar; direito/frontal (gx+1) fica no térreo
    // Em isométrico, menor gx fica atrás-esquerda e maior gx vai para frente-direita
    d.caixa(x0, y0, 0, U, U, 14, p.cor, false);
    d.telhado(x0, y0, 14, U, U, 4, p.cor, "y");
    d.caixa(x0 + U, y0, 0, U, U, 7.5, p.cor, true);
  } else {
    // Orientado em 1x2 ao longo de Y: bloco traseiro (gy) sobe 2º andar; frontal (gy+1) fica no térreo
    d.caixa(x0, y0, 0, U, U, 14, p.cor, false);
    d.telhado(x0, y0, 14, U, U, 4, p.cor, "x");
    d.caixa(x0, y0 + U, 0, U, U, 7.5, p.cor, true);
  }
}

export interface ItemBlocoGrupo {
  porte: Porte;
  cor: string;
}

const ORDEM_PORTE: Record<Porte, number> = { GRANDE: 3, MEDIA: 2, PEQUENA: 1 };

/**
 * Empacotador de grade 2D (Grid Packer):
 * Aloca M/G (2 células) e P (1 célula) em posições adjacentes sem sobreposição,
 * mantendo os maiores atrás (menor gx+gy) e os menores na frente.
 */
function alocarNaGrade(itens: ItemBlocoGrupo[]): PecaAlocada[] {
  const ordenados = [...itens].sort((a, b) => ORDEM_PORTE[b.porte] - ORDEM_PORTE[a.porte]);
  const ocupadas = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  const livre = (gx: number, gy: number, gw: number, gd: number) => {
    for (let dx = 0; dx < gw; dx++) {
      for (let dy = 0; dy < gd; dy++) {
        if (ocupadas.has(key(gx + dx, gy + dy))) return false;
      }
    }
    return true;
  };

  const ocupar = (gx: number, gy: number, gw: number, gd: number) => {
    for (let dx = 0; dx < gw; dx++) {
      for (let dy = 0; dy < gd; dy++) {
        ocupadas.add(key(gx + dx, gy + dy));
      }
    }
  };

  // Candidatos ordenados por proximidade da origem (compacto e de trás para frente)
  const candidatos: [number, number][] = [];
  for (let s = 0; s <= 8; s++) {
    for (let gx = 0; gx <= s; gx++) {
      const gy = s - gx;
      if (gx <= 4 && gy <= 4) candidatos.push([gx, gy]);
    }
  }

  const alocadas: PecaAlocada[] = [];

  for (let i = 0; i < ordenados.length; i++) {
    const item = ordenados[i];
    const precisa2 = item.porte !== "PEQUENA";
    let colocada = false;

    for (const [gx, gy] of candidatos) {
      if (!precisa2) {
        if (livre(gx, gy, 1, 1)) {
          ocupar(gx, gy, 1, 1);
          alocadas.push({ gx, gy, gw: 1, gd: 1, ...item });
          colocada = true;
          break;
        }
      } else {
        // Alterna preferência entre 2x1 e 1x2 para formar conjunto compacto em "L" ou quadrado
        const orientacoes: [number, number][] = i % 2 === 0 ? [[2, 1], [1, 2]] : [[1, 2], [2, 1]];
        for (const [gw, gd] of orientacoes) {
          if (livre(gx, gy, gw, gd)) {
            ocupar(gx, gy, gw, gd);
            alocadas.push({ gx, gy, gw, gd, ...item });
            colocada = true;
            break;
          }
        }
        if (colocada) break;
      }
    }
  }

  // Painter's Algorithm: ordena pela profundidade máxima/média da peça (de trás para frente)
  return alocadas.sort((a, b) => {
    const profA = a.gx + (a.gw - 1) * 0.5 + a.gy + (a.gd - 1) * 0.5;
    const profB = b.gx + (b.gw - 1) * 0.5 + b.gy + (b.gd - 1) * 0.5;
    return profA - profB;
  });
}

/** SVG puro para legenda (sem depender do Leaflet no SSR). */
export function svgIconeEscola(porte: Porte, cor: string, escala = 1.2) {
  const d = new Desenho();
  const gw = porte === "PEQUENA" ? 1 : 2;
  desenharPeca(d, { gx: 0, gy: 0, gw, gd: 1, porte, cor });
  return d.svg(escala).svg;
}

/** Opções de DivIcon individual de uma escola (P, M ou G) com tamanhos proporcionais reais. */
export function iconeEscola(porte: Porte, cor: string, selecionada: boolean) {
  const d = new Desenho();
  const gw = porte === "PEQUENA" ? 1 : 2;
  desenharPeca(d, { gx: 0, gy: 0, gw, gd: 1, porte, cor });
  const escala = selecionada ? 1.55 : 1.25;
  const { svg, largura, altura } = d.svg(escala, `cubo-escola${selecionada ? " selecionada" : ""}`);
  return {
    className: "marcador-escola",
    html: `<div style="position:relative;width:${largura.toFixed(0)}px;height:${altura.toFixed(0)}px">${
      selecionada ? '<span class="pulso-escola"></span>' : ""
    }${svg}</div>`,
    iconSize: [largura, altura] as [number, number],
    iconAnchor: [largura / 2, altura * 0.78] as [number, number],
    popupAnchor: [0, -altura * 0.7] as [number, number],
  };
}

/**
 * Opções de DivIcon para grupo encaixado no zoom-out.
 * Limita a até 6 blocos encaixados (sem selo +N), com P (1x1), M (2x1) e G (2x1 com 2º andar).
 */
export function iconeGrupoEscolas(itens: ItemBlocoGrupo[], selecionado: boolean) {
  let amostra = itens;
  if (itens.length > 6) {
    const passo = itens.length / 6;
    amostra = Array.from({ length: 6 }, (_, i) => itens[Math.min(itens.length - 1, Math.floor(i * passo))]);
  }

  const pecas = alocarNaGrade(amostra);
  const d = new Desenho();
  for (const p of pecas) {
    desenharPeca(d, p);
  }

  const escala = selecionado ? 1.35 : 1.15;
  const { svg, largura, altura } = d.svg(escala, `cubo-escola${selecionado ? " selecionada" : ""}`);
  return {
    className: "marcador-escola",
    html: `<div style="position:relative;width:${largura.toFixed(0)}px;height:${altura.toFixed(0)}px">${
      selecionado ? '<span class="pulso-escola"></span>' : ""
    }${svg}</div>`,
    iconSize: [largura, altura] as [number, number],
    iconAnchor: [largura / 2, altura * 0.75] as [number, number],
    popupAnchor: [0, -altura * 0.65] as [number, number],
  };
}
