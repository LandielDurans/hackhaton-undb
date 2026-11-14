/**
 * Marca Conecta Educação SLZ — flor de azulejo do Centro Histórico de São Luís.
 * 4 pétalas = 4 verbos do desafio (Integrar, Visualizar, Planejar, Acompanhar),
 * nas cores do lettering da Prefeitura. O ponto central é o estudante.
 */
export function LogoMark({ size = 34, centro = "#ffffff" }: { size?: number; centro?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
      <path d="M0 0A16 16 0 0 1 16 16A16 16 0 0 1 0 0Z" fill="#2071b7" />
      <path d="M18 16A16 16 0 0 1 34 0A16 16 0 0 1 18 16Z" fill="#39a6de" />
      <path d="M16 18A16 16 0 0 1 0 34A16 16 0 0 1 16 18Z" fill="#a8c048" />
      <path d="M18 18A16 16 0 0 1 34 34A16 16 0 0 1 18 18Z" fill="#f2c230" />
      <circle cx="17" cy="17" r="4.2" fill={centro} />
    </svg>
  );
}

/** Assinatura horizontal. `claro` = sobre fundo claro (texto em Azul Profundo). */
export function Logo({ compacto, claro }: { compacto?: boolean; claro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark centro={claro ? "#ffffff" : "#0d2b4a"} />
      {!compacto && (
        <div className="leading-none">
          <div className={`font-display font-bold text-[21px] tracking-[-0.03em] ${claro ? "text-azulejo-900" : "text-white"}`}>conecta</div>
          <div className={`mt-0.5 font-display font-medium text-[10.5px] tracking-[0.06em] ${claro ? "text-azulejo-500" : "text-ceu"}`}>
            educação · são luís
          </div>
        </div>
      )}
    </div>
  );
}

/** Logo oficial da Prefeitura de São Luís (co-assinatura institucional). */
export function LogoPrefeitura({ altura = 56, className = "" }: { altura?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/marca/prefeitura-sao-luis.png" alt="Prefeitura de São Luís — Por uma cidade melhor"
      style={{ height: altura, width: "auto" }} className={className} />
  );
}
