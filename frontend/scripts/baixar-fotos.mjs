// Baixa as fotos reais de São Luís usadas na interface (Wikimedia Commons, licenças livres).
// Uso: node scripts/baixar-fotos.mjs   (rodar dentro de /frontend, com internet)
import { mkdir, writeFile } from "node:fs/promises";

const FOTOS = [
  // Centro Histórico — JLPizzol, CC BY-SA 4.0 — https://commons.wikimedia.org/wiki/File:São_Luis_11.jpg
  ["centro-historico.jpg", "São_Luis_11.jpg"],
  // Palácio dos Leões — Ridiculopathy, CC0 — https://commons.wikimedia.org/wiki/File:Mar2024._São_Luís,_Maranhão._Palácio_dos_Leões_01.jpg
  ["palacio-dos-leoes.jpg", "Mar2024._São_Luís,_Maranhão._Palácio_dos_Leões_01.jpg"],
];

await mkdir("public/fotos", { recursive: true });
for (const [arquivo, titulo] of FOTOS) {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(titulo)}?width=1920`;
  const r = await fetch(url, { headers: { "User-Agent": "ConectaEducacaoSLZ/1.0 (hackathon demo)" } });
  if (!r.ok) { console.error(`Falhou ${arquivo}: HTTP ${r.status}`); continue; }
  await writeFile(`public/fotos/${arquivo}`, Buffer.from(await r.arrayBuffer()));
  console.log(`ok  public/fotos/${arquivo}`);
}
