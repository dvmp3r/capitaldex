// Espacio duro antes del sufijo para que nunca se parta de línea.
const UNITS: [number, string][] = [
  [1e18, " T"], // trillón (es)
  [1e15, " mil B"],
  [1e12, " B"], // billón (es) = 1e12
  [1e9, " mil M"],
  [1e6, " M"],
  [1e3, " k"],
];

const nf = (digits: number, fixed = false) =>
  new Intl.NumberFormat("es-ES", { minimumFractionDigits: fixed ? digits : 0, maximumFractionDigits: digits });

/** 1234567 → "1,23 M". Convención española: M = millón, mil M = 1e9, B = billón (1e12). */
export function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "∞";
  const abs = Math.abs(n);
  for (const [value, suffix] of UNITS) {
    // Decimales fijos: "13,90 k" no se encoge a "13,9 k" y la cifra no parpadea al cambiar.
    if (abs >= value) return nf(digits, true).format(n / value) + suffix;
  }
  return nf(abs < 10 ? digits : 0).format(n);
}

/** Capital del juego (sin decimales por debajo de 1000). */
export function fmtCapital(n: number): string {
  return Math.abs(n) < 1000 ? nf(0).format(Math.floor(n)) : fmt(n, 2);
}

/** Importe en dólares con sufijo. */
export function fmtUsd(n: number | null | undefined): string {
  if (n == null) return "–";
  return fmt(n, 1) + " $";
}

export function fmtPct(frac: number | null | undefined, digits = 1): string {
  if (frac == null) return "–";
  return nf(digits).format(frac * 100) + " %";
}

export function fmtMult(m: number): string {
  return "×" + nf(2).format(m);
}

export function fmtDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s % 60} s`;
  return `${s} s`;
}

/**
 * Código de país para mostrar. Windows no dibuja las banderas emoji, así que se usa el
 * código ISO en texto; en una fase posterior se sustituirá por banderas SVG propias.
 */
export function flag(code: string): string {
  if (!code || code.length !== 2 || code === "UN") return "--";
  return code.toUpperCase();
}
