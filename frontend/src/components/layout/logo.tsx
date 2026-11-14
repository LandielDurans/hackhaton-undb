/** Marca: a estrela branca sobre o azul do cantão da bandeira do Maranhão. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
      <rect width="34" height="34" rx="8" fill="#0f3b91" stroke="#ffffff" strokeOpacity="0.35" />
      <path d="M17 7.5l2.6 7.9h8.3l-6.7 4.9 2.6 7.9L17 23.3l-6.8 4.9 2.6-7.9-6.7-4.9h8.3z" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ compacto }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!compacto && (
        <div className="leading-tight">
          <div className="font-display font-extrabold text-white text-[15.5px] tracking-tight">Conecta Educação</div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold tracking-[0.2em] text-white/75">
            <span className="faixas-ma-h inline-block h-[7px] w-5 rounded-[1px]" aria-hidden />SÃO LUÍS · MA
          </div>
        </div>
      )}
    </div>
  );
}
