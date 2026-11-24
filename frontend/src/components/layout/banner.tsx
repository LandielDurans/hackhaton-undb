/**
 * Faixa de abertura das páginas internas com a cara de São Luís:
 * foto real da cidade (ou painel de azulejos), véu em Azul Profundo,
 * barrado de azulejo português e a faixa de 4 cores da Prefeitura.
 */
export function BannerSaoLuis({
  eyebrow,
  titulo,
  descricao,
  foto,
  posicaoFoto = "center",
  credito,
  children,
  compacto,
}: {
  eyebrow: React.ReactNode;
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  /** Caminho em /public/fotos. Sem foto, o fundo vira um painel de azulejos. */
  foto?: string;
  posicaoFoto?: string;
  credito?: string;
  /** Ações à direita (botões, selos). */
  children?: React.ReactNode;
  compacto?: boolean;
}) {
  const fundo = foto
    ? {
        backgroundImage: `linear-gradient(90deg, rgb(8 28 51 / 0.95) 0%, rgb(13 43 74 / 0.78) 50%, rgb(13 43 74 / 0.25) 100%), url(${foto})`,
        backgroundPosition: posicaoFoto,
      }
    : undefined;

  return (
    <section
      className={`relative mb-5 overflow-hidden rounded-2xl bg-azulejo-900 bg-cover text-white shadow-[var(--shadow-card)] ${foto ? "" : "azulejo-pattern"}`}
      style={fundo}
    >
      {/* Painel de azulejos à direita quando não há foto */}
      {!foto && (
        <div
          className="azulejo-barrado azulejo-barrado-lg absolute inset-y-0 right-0 hidden w-[38%] md:block"
          style={{ maskImage: "linear-gradient(90deg, transparent 0%, #000 45%)", WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 45%)" }}
          aria-hidden
        />
      )}

      <div
        className={`relative flex flex-col gap-4 px-5 md:flex-row md:items-end md:justify-between md:px-7 ${compacto ? "py-4 md:py-5" : "py-6 md:py-7"}`}
      >
        <div className="min-w-0 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sol">{eyebrow}</p>
          <h1 className={`mt-1 font-bold leading-tight ${compacto ? "text-[22px] md:text-[26px]" : "text-[24px] md:text-[30px]"}`}>{titulo}</h1>
          {descricao && <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/80">{descricao}</p>}
        </div>
        {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
      </div>

      {credito && (
        <p className="absolute bottom-[18px] right-3 hidden text-[10px] text-white/45 md:block">{credito}</p>
      )}

      {/* Barrado de azulejo + faixa de 4 cores, como o rodapé dos casarões */}
      <div className="azulejo-barrado relative h-[10px] [background-size:20px_20px] opacity-90" aria-hidden />
      <div className="faixa-slz-h relative h-[4px]" aria-hidden />
    </section>
  );
}
