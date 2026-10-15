/** Marca de CapitalDex: cápsula dorada con una línea de cotización. Misma forma que el favicon. */
export function LogoMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="14" fill="#141416" />
      <circle cx="32" cy="31" r="18" fill="#c48a0e" />
      <path d="M14 31a18 18 0 0 1 36 0z" fill="#f5b921" />
      <path d="M14 31h36" stroke="#141416" strokeWidth="2.2" />
      <ellipse cx="25" cy="22" rx="6" ry="3.5" fill="#fff" opacity="0.55" transform="rotate(-25 25 22)" />
      <path d="M18 52l8-7 7 4 13-11" fill="none" stroke="#f5b921" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Marca + nombre, para la cabecera y la introducción. */
export function Wordmark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size * 1.25} />
      <span className="font-sans font-extrabold tracking-tight" style={{ fontSize: size, fontVariationSettings: '"opsz" 96' }}>
        Capital<span className="text-gold">Dex</span>
      </span>
    </span>
  );
}
