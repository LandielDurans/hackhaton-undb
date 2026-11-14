export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#ffffff" fillOpacity="0.12" />
      <path d="M16 5l3.2 7.8L27 16l-7.8 3.2L16 27l-3.2-7.8L5 16l7.8-3.2z" fill="#f4f1ea" />
      <circle cx="16" cy="16" r="3" fill="#d9773f" />
    </svg>
  );
}

export function Logo({ compacto }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!compacto && (
        <div className="leading-tight">
          <div className="font-display font-bold text-white text-[15px] tracking-tight">Conecta Educação</div>
          <div className="text-[11px] font-semibold tracking-[0.18em] text-terracota-500">SÃO LUÍS</div>
        </div>
      )}
    </div>
  );
}
