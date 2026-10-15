import { useMemo } from "react";
import { mulberry32 } from "../game/hash";
import type { Rarity } from "../game/types";

export type MachinePhase = "idle" | "turning" | "dropping" | "opening" | "revealed";

const W = 300;
const H = 420;
const DOME = { cx: 150, cy: 150, r: 118 };
const CAP_R = 17;

/** Reparto de colores de las cápsulas de la cúpula (decorativo, parecido a las probabilidades reales). Las raras van primero para que siempre se vean. */
const DOME_MIX: Rarity[] = [
  "legendaria", "epica", "rara", "comun", "poco_comun", "comun", "rara", "comun", "poco_comun", "comun", "rara",
  "comun", "poco_comun", "comun", "comun", "poco_comun", "comun", "comun", "poco_comun", "comun", "poco_comun", "comun",
];

interface Props {
  phase: MachinePhase;
  /** Rareza de la cápsula que cae (se conoce al girar). */
  capsule?: Rarity;
  className?: string;
}

/** Máquina de cápsulas dibujada en SVG. Las animaciones de fase van por CSS (ver index.css, sección "máquina"). */
export function GachaMachine({ phase, capsule = "comun", className = "" }: Props) {
  const capsules = useMemo(() => layoutCapsules(), []);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`machine machine-${phase} ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id="m-glass" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="white" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="white" stopOpacity="0.12" />
          <stop offset="1" stopColor="white" stopOpacity="0.02" />
        </radialGradient>
        <linearGradient id="m-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.34 0.015 353)" />
          <stop offset="1" stopColor="oklch(0.22 0.015 353)" />
        </linearGradient>
        <clipPath id="m-dome-clip">
          <circle cx={DOME.cx} cy={DOME.cy} r={DOME.r - 6} />
        </clipPath>
        <filter id="m-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Sombra en el suelo */}
      <ellipse cx="150" cy="408" rx="96" ry="7" fill="oklch(0 0 0 / 0.18)" />

      {/* Cuerpo */}
      <rect x="50" y="262" width="200" height="140" rx="20" fill="url(#m-body)" />
      <rect x="62" y="274" width="176" height="6" rx="3" fill="white" fillOpacity="0.08" />
      <rect x="40" y="248" width="220" height="24" rx="9" fill="oklch(0.27 0.015 353)" />
      <rect x="40" y="248" width="220" height="5" rx="2.5" fill="white" fillOpacity="0.1" />

      {/* Salida y bandeja */}
      <rect x="183" y="334" width="56" height="48" rx="9" fill="oklch(0.14 0.01 353)" />
      <rect x="183" y="334" width="56" height="48" rx="9" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="2" />
      <rect x="176" y="380" width="70" height="10" rx="4" fill="oklch(0.45 0.02 353)" />

      {/* Etiqueta frontal */}
      <rect x="66" y="344" width="98" height="36" rx="8" fill="white" fillOpacity="0.08" />
      <text x="115" y="367" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="15" fill="white" fillOpacity="0.9">
        CapitalDex
      </text>

      {/* Manivela */}
      <g className="machine-knob" style={{ transformOrigin: "150px 304px" }}>
        <circle cx="150" cy="304" r="27" fill="oklch(0.93 0.005 353)" stroke="oklch(0.6 0.02 353)" strokeWidth="3" />
        <rect x="145" y="282" width="10" height="44" rx="5" fill="oklch(0.3 0.015 353)" />
        <circle cx="150" cy="304" r="4" fill="oklch(0.3 0.015 353)" />
      </g>

      {/* Cúpula con cápsulas */}
      <circle cx={DOME.cx} cy={DOME.cy} r={DOME.r} fill="oklch(0.97 0.004 353)" />
      <g clipPath="url(#m-dome-clip)" className="machine-caps">
        {capsules.map((c, i) => (
          <Capsule key={i} x={c.x} y={c.y} r={CAP_R} rarity={c.rarity} tilt={c.tilt} />
        ))}
      </g>
      <circle cx={DOME.cx} cy={DOME.cy} r={DOME.r} fill="url(#m-glass)" stroke="oklch(0.82 0.01 353)" strokeWidth="4" />
      <ellipse cx="104" cy="92" rx="22" ry="44" fill="white" fillOpacity="0.4" transform="rotate(-28 104 92)" />

      {/* Cápsula que cae (solo visible en las fases de caída y apertura) */}
      <g className="machine-drop">
        <circle className="machine-flash" cx="0" cy="0" r="40" fill={`var(--color-${capsule})`} filter="url(#m-glow)" />
        <g className="machine-drop-top">
          <path d={`M ${-CAP_R - 3} 0 A ${CAP_R + 3} ${CAP_R + 3} 0 0 1 ${CAP_R + 3} 0 Z`} fill={`var(--color-${capsule})`} />
          <ellipse cx="-7" cy="-11" rx="5" ry="3" fill="white" fillOpacity="0.55" transform="rotate(-30 -7 -11)" />
        </g>
        <path d={`M ${-CAP_R - 3} 0 A ${CAP_R + 3} ${CAP_R + 3} 0 0 0 ${CAP_R + 3} 0 Z`} fill="oklch(0.97 0 0)" stroke={`var(--color-${capsule})`} strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function Capsule({ x, y, r, rarity, tilt }: { x: number; y: number; r: number; rarity: Rarity; tilt: number }) {
  const color = `var(--color-${rarity})`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <path d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 Z`} fill={color} />
      <path d={`M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0 Z`} fill="oklch(0.97 0 0)" stroke={color} strokeWidth="1.2" />
      <ellipse cx={-r * 0.35} cy={-r * 0.55} rx={r * 0.28} ry={r * 0.16} fill="white" fillOpacity="0.55" transform={`rotate(-30 ${-r * 0.35} ${-r * 0.55})`} />
    </g>
  );
}

/** Coloca las cápsulas dentro de la cúpula sin que se solapen; el resultado es siempre el mismo. */
function layoutCapsules() {
  const rng = mulberry32(20261015);
  const out: { x: number; y: number; rarity: Rarity; tilt: number }[] = [];
  const limit = DOME.r - CAP_R - 8;
  let guard = 0;
  while (out.length < DOME_MIX.length && guard++ < 50000) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * limit;
    const x = DOME.cx + Math.cos(a) * d;
    const y = DOME.cy + 14 + Math.sin(a) * d; // algo más abajo: están apiladas
    if (y < DOME.cy - 70 || Math.hypot(x - DOME.cx, y - DOME.cy) > limit) continue;
    if (out.some((c) => Math.hypot(c.x - x, c.y - y) < CAP_R * 2 - 1)) continue;
    out.push({ x, y, rarity: DOME_MIX[out.length], tilt: Math.round((rng() - 0.5) * 70) });
  }
  return out;
}
