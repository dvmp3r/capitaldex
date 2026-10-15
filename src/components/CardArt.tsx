import { useMemo } from "react";
import { hashString, mulberry32 } from "../game/hash";
import { sectorHue } from "../game/sectors";

const W = 200;
const H = 100;
const N = 28;

/**
 * Arte determinista de cada carta: una silueta de gráfico generada a partir del ticker.
 * Sin logos: cada empresa tiene una forma única y el color de su sector.
 */
export function CardArt({ seed, sector, className = "" }: { seed: string; sector: string; className?: string }) {
  const hue = sectorHue(sector);
  const { area, line, last } = useMemo(() => buildPaths(seed), [seed]);
  const id = `g-${seed.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={`card-art block h-full w-full ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`oklch(0.7 0.16 ${hue})`} stopOpacity="0.55" />
          <stop offset="1" stopColor={`oklch(0.7 0.16 ${hue})`} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map((y) => (
        <line key={y} x1="0" x2={W} y1={y} y2={y} stroke={`oklch(0.5 0.05 ${hue})`} strokeOpacity="0.12" strokeWidth="0.6" />
      ))}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={`oklch(0.52 0.17 ${hue})`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={`oklch(0.52 0.17 ${hue})`} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function buildPaths(seed: string) {
  const rng = mulberry32(hashString(seed));
  const pts: [number, number][] = [];
  let v = 30 + rng() * 25;
  const drift = 0.6 + rng() * 0.9; // cada empresa "sube" a su ritmo
  for (let i = 0; i < N; i++) {
    v += (rng() - 0.5) * 16 + drift;
    v = Math.min(92, Math.max(8, v));
    pts.push([(i / (N - 1)) * W, H - v]);
  }
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  return { area, line, last: pts[pts.length - 1] };
}
