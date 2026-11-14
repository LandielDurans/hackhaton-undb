/**
 * Ícones isométricos das escolas no traço do esboço (contorno azul-marinho), coloridos pela faixa do foco de calor.
 * PEQUENA (< 200 matrículas) = cubo · MEDIA (200 a 1.000) = prédio · GRANDE (> 1.000) = escola com telhado, torre e bandeira.
 */
export type Porte = "PEQUENA" | "MEDIA" | "GRANDE";

export const PORTE_ROTULO: Record<Porte, string> = {
  PEQUENA: "Pequena · menos de 200 estudantes",
  MEDIA: "Média · 200 a 1.000",
  GRANDE: "Grande · mais de 1.000",
};

const TINTA = "#081f55";
type P3 = [number, number, number];

/** Projeção isométrica: x desce para a direita, y desce para a esquerda, z sobe. */
function iso([x, y, z]: P3): [number, number] {
  return [(x - y) * 0.866, (x + y) * 0.5 - z];
}

function claro(cor: string, pct: number) { return `color-mix(in srgb, ${cor} ${pct}%, white)`; }
function escuro(cor: string, pct: number) { return `color-mix(in srgb, ${cor} ${pct}%, black)`; }

class Desenho {
  faces: { pts: P3[]; fill: string; stroke?: string; sw?: number; op?: number }[] = [];
  linhas: { a: P3; b: P3; cor: string; sw: number }[] = [];

  face(pts: P3[], fill: string, sw = 1.3, stroke = TINTA, op = 1) { this.faces.push({ pts, fill, stroke, sw, op }); }
  linha(a: P3, b: P3, cor = TINTA, sw = 1.2) { this.linhas.push({ a, b, cor, sw }); }

  /** Caixa com as três faces visíveis (topo, frente +y, lado +x). */
  caixa(x0: number, y0: number, z0: number, w: number, d: number, h: number, cor: string, topo = true) {
    const x1 = x0 + w, y1 = y0 + d, z1 = z0 + h;
    this.face([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], cor);
    this.face([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], escuro(cor, 72));
    if (topo) this.face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], claro(cor, 45));
  }

  /** Janela retangular na face frontal (+y) ou lateral (+x). */
  janela(face: "y" | "x", fixo: number, a0: number, a1: number, z0: number, z1: number, fill = "rgba(255,255,255,0.88)") {
    const p = (a: number, z: number): P3 => (face === "y" ? [a, fixo, z] : [fixo, a, z]);
    this.face([p(a0, z0), p(a1, z0), p(a1, z1), p(a0, z1)], fill, 0.7);
  }

  svg(escala: number, extraClasse = "") {
    const todos = [...this.faces.flatMap(f => f.pts), ...this.linhas.flatMap(l => [l.a, l.b])].map(iso);
    const xs = todos.map(p => p[0]), ys = todos.map(p => p[1]);
    const pad = 2;
    const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) + pad - minX, h = Math.max(...ys) + pad - minY;
    const pt = (p: P3) => { const [a, b] = iso(p); return `${(a - minX).toFixed(2)},${(b - minY).toFixed(2)}`; };
    const corpo = [
      ...this.faces.map(f => `<polygon points="${f.pts.map(pt).join(" ")}" fill="${f.fill}" stroke="${f.stroke}" stroke-width="${f.sw}" stroke-linejoin="round"${f.op !== 1 ? ` opacity="${f.op}"` : ""}/>`),
      ...this.linhas.map(l => `<line x1="${pt(l.a).split(",")[0]}" y1="${pt(l.a).split(",")[1]}" x2="${pt(l.b).split(",")[0]}" y2="${pt(l.b).split(",")[1]}" stroke="${l.cor}" stroke-width="${l.sw}" stroke-linecap="round"/>`),
    ].join("");
    const largura = w * escala, altura = h * escala;
    return { svg: `<svg width="${largura.toFixed(1)}" height="${altura.toFixed(1)}" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" class="${extraClasse}">${corpo}</svg>`, largura, altura, minX, minY };
  }
}

function cubo(cor: string) {
  const d = new Desenho();
  d.caixa(0, 0, 0, 10, 10, 10, cor);
  d.janela("y", 10, 3.5, 6.5, 0, 5, escuro(cor, 45)); // porta
  return { d, chao: [5, 5, 0] as P3 };
}

function predio(cor: string) {
  const d = new Desenho();
  d.caixa(0, 0, 0, 10, 10, 17, cor);
  d.caixa(1, 1, 17, 8, 8, 1.4, claro(cor, 70)); // platibanda
  for (let andar = 0; andar < 3; andar++) {
    const z = 4 + andar * 4.4;
    d.janela("y", 10, 1.5, 4, z, z + 2.6); d.janela("y", 10, 6, 8.5, z, z + 2.6);
    d.janela("x", 10, 1.5, 4, z, z + 2.6, "rgba(255,255,255,0.7)"); d.janela("x", 10, 6, 8.5, z, z + 2.6, "rgba(255,255,255,0.7)");
  }
  d.janela("y", 10, 3.8, 6.2, 0, 3, escuro(cor, 45)); // entrada
  return { d, chao: [5, 5, 0] as P3 };
}

function escola(cor: string) {
  const d = new Desenho();
  const W = 26, D = 12, H = 9, RH = 5, ym = D / 2;
  const telhado = escuro(cor, 55);
  // água traseira do telhado primeiro, corpo, oitão e água frontal por cima
  d.face([[0, 0, H], [W, 0, H], [W, ym, H + RH], [0, ym, H + RH]], escuro(cor, 40));
  d.caixa(0, 0, 0, W, D, H, cor, false);
  d.face([[W, 0, H], [W, D, H], [W, ym, H + RH]], escuro(cor, 62));
  d.face([[0, D, H], [W, D, H], [W, ym, H + RH], [0, ym, H + RH]], telhado);
  d.linha([0, ym, H + RH], [W, ym, H + RH], TINTA, 1.4);
  // janelas da fachada e porta central
  for (const a of [2, 5.5, 18, 21.5]) d.janela("y", D, a, a + 2.4, 3.2, 6.6);
  d.janela("x", W, 3, 5.4, 3.2, 6.6, "rgba(255,255,255,0.7)"); d.janela("x", W, 6.6, 9, 3.2, 6.6, "rgba(255,255,255,0.7)");
  // torre central com porta e telhado em pirâmide
  const tx = 10, ty = D - 1, tw = 6, td = 4, th = 15;
  d.caixa(tx, ty, 0, tw, td, th, claro(cor, 82), false);
  d.janela("y", ty + td, tx + 1.6, tx + 4.4, 0, 4.8, escuro(cor, 45));
  d.janela("y", ty + td, tx + 2, tx + 4, 8.5, 11.5, "rgba(255,255,255,0.9)"); // relógio/janela
  const topo: P3 = [tx + tw / 2, ty + td / 2, th + 5];
  d.face([[tx, ty + td, th], [tx + tw, ty + td, th], topo], telhado);
  d.face([[tx + tw, ty, th], [tx + tw, ty + td, th], topo], escuro(cor, 40));
  // mastro com a bandeira do Maranhão
  const base: P3 = [topo[0], topo[1], topo[2]];
  const ponta: P3 = [topo[0], topo[1], topo[2] + 8];
  d.linha(base, ponta, TINTA, 1.1);
  const fx = topo[0], fy = topo[1], fz = topo[2] + 8;
  const faixa = (z0: number, z1: number, c: string) => d.face([[fx, fy, z0], [fx + 6, fy, z0 - 0], [fx + 6, fy, z1], [fx, fy, z1]], c, 0.4);
  faixa(fz - 3.6, fz - 2.4, "#111111"); faixa(fz - 2.4, fz - 1.2, "#ffffff"); faixa(fz - 1.2, fz, "#c8102e");
  d.face([[fx, fy, fz - 1.8], [fx + 2.4, fy, fz - 1.8], [fx + 2.4, fy, fz], [fx, fy, fz]], "#0f3b91", 0.4);
  return { d, chao: [W / 2, D / 2 + 1.5, 0] as P3 };
}

const ESCALA: Record<Porte, number> = { PEQUENA: 1.4, MEDIA: 1.35, GRANDE: 1.45 };

/** HTML do ícone e o ponto de ancoragem (base do prédio) em pixels. */
export function iconeEscola(porte: Porte, cor: string, selecionada = false) {
  const { d, chao } = porte === "GRANDE" ? escola(cor) : porte === "MEDIA" ? predio(cor) : cubo(cor);
  const esc = ESCALA[porte] * (selecionada ? 1.25 : 1);
  const r = d.svg(esc, "icone-escola" + (selecionada ? " selecionada" : ""));
  const [cx, cy] = iso(chao);
  const ancora: [number, number] = [(cx - r.minX) * esc, (cy - r.minY) * esc];
  return { html: r.svg, largura: r.largura, altura: r.altura, ancora };
}
