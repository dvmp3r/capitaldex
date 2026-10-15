import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { RARITY_HEX } from "../../game/rarity";
import { RARITIES, type Rarity } from "../../game/types";
import { GEOM, GachaSim } from "./sim";

/** Misma interfaz que las máquinas anteriores: GachaStage la dirige por fases. */
export interface MachineHandle {
  turn: () => Promise<void>;
  drop: (rarity: Rarity) => Promise<void>;
  open: () => Promise<void>;
  reset: () => void;
  skip: (rarity: Rarity) => void;
}

interface Props {
  dimmed?: boolean;
  idle?: boolean;
  className?: string;
}

/* Proyección de la simulación (unidades) al lienzo SVG (px). */
const S = 100; // px por unidad
const OX = 150;
const OY = 120 + GEOM.dome.c.y * S; // y del suelo (y=0) en px
const px = (x: number) => OX + x * S;
const py = (y: number) => OY - y * S;
const DOME = { cx: px(GEOM.dome.c.x), cy: py(GEOM.dome.c.y), r: (GEOM.dome.r + 0.05) * S };
const CAP_R = GEOM.capR * S;
const DROP_R = GEOM.dropR * S;
const WIN = { x: px(GEOM.spawn.x) - 34, y: py(1.55), w: 68, h: py(0.42) - py(1.55) };

/** Máquina de cápsulas en 2D (SVG). La física de las cápsulas viene de la simulación; el dibujo se actualiza por fotograma. */
export const Machine2D = forwardRef<MachineHandle, Props>(function Machine2D({ dimmed = false, className = "" }, ref) {
  const sim = useMemo(() => new GachaSim(), []);
  const capsRef = useRef<(SVGGElement | null)[]>([]);
  const crank = useRef<SVGGElement>(null);
  const drop = useRef<SVGGElement>(null);
  const dropBall = useRef<SVGCircleElement>(null);
  const dropLid = useRef<SVGPathElement>(null);
  const glow = useRef<SVGCircleElement>(null);
  const sparks = useRef<SVGGElement>(null);

  // En desarrollo: acceso desde la consola para forzar estados.
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __gachaSim?: GachaSim }).__gachaSim = sim;
  }, [sim]);

  const settle = (p: Promise<void>, ms: number) => Promise.race([p, new Promise<void>((r) => window.setTimeout(r, ms))]);
  useImperativeHandle(ref, () => ({
    turn: () => settle(sim.turn(), 1100),
    drop: (r) => settle(sim.drop(r), 2000),
    open: () => settle(sim.open(), 1400),
    reset: () => sim.reset(),
    skip: (r) => sim.skip(r),
  }), [sim]);

  // Bucle de dibujo: paso fijo con acumulador y actualización directa del DOM.
  useEffect(() => {
    let id = 0;
    let last = performance.now();
    let acc = 0;
    const STEP = 1 / 60;
    const loop = (now: number) => {
      acc = Math.min(acc + (now - last) / 1000, STEP * 10);
      last = now;
      let n = 0;
      while (acc >= STEP && n++ < 10) {
        sim.step(STEP);
        acc -= STEP;
      }
      // Cápsulas de la cúpula (solo x e y; la z se usa para el tamaño aparente)
      sim.caps.forEach((c, i) => {
        const g = capsRef.current[i];
        if (!g) return;
        const scale = 1 + c.p.z * 0.12;
        g.setAttribute("transform", `translate(${px(c.p.x).toFixed(1)} ${py(c.p.y).toFixed(1)}) scale(${scale.toFixed(3)}) rotate(${((c.rot.z * 180) / Math.PI).toFixed(1)})`);
      });
      if (crank.current) crank.current.setAttribute("transform", `rotate(${((-sim.crank.angle * 180) / Math.PI).toFixed(1)})`);
      // Cápsula que cae
      const d = sim.capsule;
      if (drop.current) {
        drop.current.style.display = d.active ? "" : "none";
        if (d.active) {
          drop.current.setAttribute("transform", `translate(${px(d.p.x).toFixed(1)} ${py(d.p.y).toFixed(1)}) scale(${d.scale.x.toFixed(3)} ${d.scale.y.toFixed(3)})`);
          dropBall.current?.setAttribute("fill", `url(#ball-${d.rarity})`);
          dropLid.current?.setAttribute("fill", `url(#ball-${d.rarity})`);
          dropLid.current?.setAttribute("transform", `translate(${(-10 * d.lid).toFixed(1)} ${(-30 * d.lid).toFixed(1)}) rotate(${(-70 * d.lid).toFixed(1)})`);
          dropLid.current?.setAttribute("opacity", String(Math.max(0, 1 - d.lid * 1.1)));
          if (glow.current) {
            glow.current.setAttribute("fill", RARITY_HEX[d.rarity]);
            glow.current.setAttribute("opacity", (d.glow * 0.8).toFixed(2));
          }
        }
      }
      // Partículas
      if (sparks.current) {
        const list = sim.particles;
        const kids = sparks.current.children;
        for (let i = 0; i < kids.length; i++) {
          const el = kids[i] as SVGCircleElement;
          const p = list[i];
          if (!p) {
            el.setAttribute("opacity", "0");
            continue;
          }
          el.setAttribute("cx", px(p.p.x).toFixed(1));
          el.setAttribute("cy", py(p.p.y).toFixed(1));
          el.setAttribute("r", (p.size * S * Math.max(0, p.life)).toFixed(1));
          el.setAttribute("opacity", Math.max(0, p.life).toFixed(2));
          el.setAttribute("fill", RARITY_HEX[d.rarity]);
        }
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [sim]);

  return (
    <div className={`${dimmed ? "machine-dimmed" : ""} ${className}`}>
      <svg viewBox="0 0 300 420" className="machine h-full w-full" aria-hidden="true">
        <defs>
          {RARITIES.map((r) => (
            <radialGradient key={r} id={`ball-${r}`} cx="35%" cy="30%" r="70%">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="0.18" stopColor={RARITY_HEX[r]} stopOpacity="1" />
              <stop offset="0.75" stopColor={RARITY_HEX[r]} />
              <stop offset="1" stopColor="#000000" stopOpacity="0.55" />
            </radialGradient>
          ))}
          <linearGradient id="m-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4b4e58" />
            <stop offset="0.08" stopColor="#3a3d46" />
            <stop offset="1" stopColor="#1b1c21" />
          </linearGradient>
          <linearGradient id="m-body-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="0.15" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.85" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="m-chrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbfbfd" />
            <stop offset="0.35" stopColor="#c9ccd4" />
            <stop offset="0.55" stopColor="#8a8e99" />
            <stop offset="0.8" stopColor="#d6d9df" />
            <stop offset="1" stopColor="#6c707b" />
          </linearGradient>
          <radialGradient id="m-knob" cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#c2c6cf" />
            <stop offset="1" stopColor="#5c606a" />
          </radialGradient>
          <radialGradient id="m-dome" cx="50%" cy="62%" r="62%">
            <stop offset="0" stopColor="#3a4254" />
            <stop offset="0.7" stopColor="#1e2330" />
            <stop offset="1" stopColor="#10131b" />
          </radialGradient>
          <radialGradient id="m-dome-shine" cx="32%" cy="24%" r="70%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="0.3" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="0.75" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.14" />
          </radialGradient>
          <linearGradient id="m-window" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.03" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>
          <filter id="m-blur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <filter id="m-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <clipPath id="m-dome-clip">
            <circle cx={DOME.cx} cy={DOME.cy} r={DOME.r - 4} />
          </clipPath>
          <clipPath id="m-lid-clip">
            <rect x={-DROP_R - 2} y={-DROP_R - 2} width={DROP_R * 2 + 4} height={DROP_R + 2} />
          </clipPath>
        </defs>

        {/* Sombra en el suelo y peana */}
        <ellipse cx="150" cy={py(0) + 6} rx="112" ry="9" fill="#000" opacity="0.6" filter="url(#m-soft)" />
        <rect x="32" y={py(0.2)} width="236" height={py(0) - py(0.2) + 4} rx="10" fill="#15161a" />

        {/* Cuerpo */}
        <rect x="45" y={py(1.935)} width="210" height={py(0.18) - py(1.935)} rx="22" fill="url(#m-body)" />
        <rect x="45" y={py(1.935)} width="210" height={py(0.18) - py(1.935)} rx="22" fill="url(#m-body-side)" />
        <rect x="45" y={py(1.935)} width="210" height={py(0.18) - py(1.935)} rx="22" fill="none" stroke="#ffffff" strokeOpacity="0.1" />
        <rect x="58" y={py(1.935) + 14} width="184" height={py(0.18) - py(1.935) - 28} rx="14" fill="#000" opacity="0.18" />

        {/* Manivela */}
        <g transform={`translate(${px(-0.55)} ${py(1.06)})`}>
          <circle r="36" fill="#0d0e12" />
          <circle r="33" fill="url(#m-chrome)" />
          <g ref={crank}>
            <circle r="26" fill="url(#m-knob)" />
            <rect x="-5" y="-30" width="10" height="60" rx="5" fill="#1f2128" />
            <rect x="-1.5" y="-27" width="3" height="54" rx="1.5" fill="#ffffff" opacity="0.18" />
            <circle r="4" fill="#15161b" />
          </g>
        </g>

        {/* Ventana de salida */}
        <rect x={WIN.x - 4} y={WIN.y - 4} width={WIN.w + 8} height={WIN.h + 8} rx="14" fill="url(#m-chrome)" />
        <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx="11" fill="#07080a" />
        <circle ref={glow} cx={px(GEOM.spawn.x)} cy={py(GEOM.trayY + GEOM.dropR)} r="40" opacity="0" filter="url(#m-blur)" />
        <g ref={drop} style={{ display: "none" }}>
          <circle ref={dropBall} r={DROP_R} fill="url(#ball-comun)" />
          <path ref={dropLid} d={`M ${-DROP_R} 0 A ${DROP_R} ${DROP_R} 0 0 1 ${DROP_R} 0 Z`} fill="url(#ball-comun)" clipPath="url(#m-lid-clip)" />
        </g>
        <g ref={sparks}>
          {Array.from({ length: 40 }, (_, i) => <circle key={i} r="2" opacity="0" />)}
        </g>
        <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} rx="11" fill="url(#m-window)" pointerEvents="none" />
        <rect x={WIN.x - 8} y={py(GEOM.trayY) - 2} width={WIN.w + 16} height="7" rx="3" fill="url(#m-chrome)" />

        {/* Collar */}
        <rect x="38" y={py(2.08)} width="224" height={py(1.9) - py(2.08)} rx="10" fill="url(#m-chrome)" />
        <rect x="38" y={py(2.08)} width="224" height={py(1.9) - py(2.08)} rx="10" fill="none" stroke="#000" strokeOpacity="0.35" />

        {/* Cúpula: fondo, cápsulas, cristal */}
        <circle cx={DOME.cx} cy={DOME.cy} r={DOME.r} fill="url(#m-dome)" />
        <g clipPath="url(#m-dome-clip)">
          {sim.caps.map((c, i) => (
            <g key={i} ref={(el) => { capsRef.current[i] = el; }}>
              <circle r={CAP_R} fill={`url(#ball-${c.rarity})`} />
            </g>
          ))}
        </g>
        <circle cx={DOME.cx} cy={DOME.cy} r={DOME.r} fill="url(#m-dome-shine)" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2.5" />
        <ellipse cx={DOME.cx - 48} cy={DOME.cy - 58} rx="16" ry="34" fill="#ffffff" opacity="0.35" transform={`rotate(-28 ${DOME.cx - 48} ${DOME.cy - 58})`} />
      </svg>
    </div>
  );
});
