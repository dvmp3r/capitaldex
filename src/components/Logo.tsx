/** Marca de CapitalDex: cápsula dorada con una línea de cotización. Misma forma que el favicon. */
export function LogoMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="14" fill="#141416" />
      <circle cx="32" cy="32" r="19" fill="#c48a0e" />
      <path d="M13 32a19 19 0 0 1 38 0z" fill="#f5b921" />
      <path d="M13 32h38" stroke="#141416" strokeWidth="2.2" />
      <ellipse cx="25" cy="23" rx="6" ry="3.5" fill="#fff" opacity="0.5" transform="rotate(-25 25 23)" />
      <path d="M10 49l11-9 7 5 8-11 6 3 12-18" fill="none" stroke="#3ddc84" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
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
