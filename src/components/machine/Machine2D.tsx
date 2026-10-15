import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { RARITY_HEX } from "../../game/rarity";
import { RARITIES, type Rarity } from "../../game/types";
import { ART_BODY, ART_DEFS, ART_DOME, ART_EXIT, ART_GLASS, ART_KNOB, ART_VIEWBOX } from "./art";
import { GEOM, GachaSim } from "./sim";

/** Misma interfaz que las máquinas anteriores: GachaStage la dirige por fases. */
export interface MachineHandle {
  turn: () => Promise<void>;
  drop: (rarity: Rarity) => Promise<void>;
  open: () => Promise<void>;
  reset: () => void;
  skip: (rarity: Rarity) => void;
  /** Recoger la cápsula abierta de la bandeja (desaparece). */
  collect: () => void;
}

interface Props {
  dimmed?: boolean;
  idle?: boolean;
  className?: string;
}

/* Proyección de la simulación (unidades) a la cúpula del dibujo (elipse). */
const SX = ART_DOME.rx / GEOM.dome.r;
const SY = ART_DOME.ry / GEOM.dome.r;
const px = (x: number) => ART_DOME.cx + (x - GEOM.dome.c.x) * SX;
const py = (y: number) => ART_DOME.cy - (y - GEOM.dome.c.y) * SY;
const CAP_R = 5.2;
const DROP_R = 5.8;
/* La cápsula que cae se proyecta a la salida del dibujo: de la boca a la base. */
const K_DROP = (ART_EXIT.yRest - ART_EXIT.yStart) / (GEOM.spawn.y - (GEOM.trayY + GEOM.dropR));
const dx = (x: number) => ART_EXIT.x + (x - GEOM.spawn.x) * 20;
const dy = (y: number) => ART_EXIT.yStart + (GEOM.spawn.y - y) * K_DROP;

/**
 * Máquina de bolas en 2D: ilustración CC0 de Openclipart como base, con las bolas de la cúpula
 * movidas por la física del juego, la manivela animada y la cápsula de la rareza saliendo por la boca.
 * Tres capas SVG: fondo estático (cuerpo), animación (bolas, cápsula, manivela) y reflejos del cristal.
 */
export const Machine2D = forwardRef<MachineHandle, Props>(function Machine2D({ dimmed = false, className = "" }, ref) {
  const sim = useMemo(() => new GachaSim(), []);
  const capsRef = useRef<(SVGCircleElement | null)[]>([]);
  const crank = useRef<SVGGElement>(null);
  const drop = useRef<SVGGElement>(null);
  const dropBall = useRef<SVGCircleElement>(null);
  const dropLid = useRef<SVGPathElement>(null);
  const glow = useRef<SVGCircleElement>(null);
  const sparks = useRef<SVGGElement>(null);

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
    collect: () => sim.collect(),
  }), [sim]);

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
      sim.caps.forEach((c, i) => {
        const el = capsRef.current[i];
        if (!el) return;
        const r = CAP_R * (1 + c.p.z * 0.1);
        el.setAttribute("cx", px(c.p.x).toFixed(2));
        el.setAttribute("cy", py(c.p.y).toFixed(2));
        el.setAttribute("r", r.toFixed(2));
      });
      if (crank.current) crank.current.setAttribute("transform", `rotate(${((-sim.crank.angle * 180) / Math.PI).toFixed(1)} ${ART_KNOB.cx} ${ART_KNOB.cy})`);
      const d = sim.capsule;
      if (drop.current) {
        drop.current.style.display = d.active ? "" : "none";
        if (d.active) {
          drop.current.setAttribute("transform", `translate(${dx(d.p.x).toFixed(2)} ${dy(d.p.y).toFixed(2)}) scale(${d.scale.x.toFixed(3)} ${d.scale.y.toFixed(3)})`);
          dropBall.current?.setAttribute("fill", `url(#ball-${d.rarity})`);
          dropLid.current?.setAttribute("fill", `url(#ball-${d.rarity})`);
          dropLid.current?.setAttribute("transform", `translate(${(-4 * d.lid).toFixed(2)} ${(-12 * d.lid).toFixed(2)}) rotate(${(-70 * d.lid).toFixed(1)})`);
          dropLid.current?.setAttribute("opacity", String(Math.max(0, 1 - d.lid * 1.1)));
          if (glow.current) {
            glow.current.setAttribute("fill", RARITY_HEX[d.rarity]);
            glow.current.setAttribute("opacity", (d.glow * 0.85).toFixed(2));
          }
        }
      }
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
          el.setAttribute("cx", dx(p.p.x).toFixed(2));
          el.setAttribute("cy", dy(p.p.y).toFixed(2));
          el.setAttribute("r", (p.size * 40 * Math.max(0, p.life)).toFixed(2));
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
    <div className={`relative ${dimmed ? "machine-dimmed" : ""} ${className}`}>
      {/* Capa 1: cuerpo de la máquina (estático) */}
      <svg viewBox={ART_VIEWBOX} className="machine absolute inset-0 h-full w-full" aria-hidden="true">
        <defs dangerouslySetInnerHTML={{ __html: ART_DEFS }} />
        <style>{`#g6572 { display: none; }`}</style>
        <g dangerouslySetInnerHTML={{ __html: ART_BODY }} />
      </svg>

      {/* Capa 2: bolas con física, cápsula de salida, manivela */}
      <svg viewBox={ART_VIEWBOX} className="machine absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          {RARITIES.map((r) => (
            <radialGradient key={r} id={`ball-${r}`} cx="35%" cy="30%" r="70%">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="0.2" stopColor={RARITY_HEX[r]} />
              <stop offset="0.78" stopColor={RARITY_HEX[r]} />
              <stop offset="1" stopColor="#000000" stopOpacity="0.5" />
            </radialGradient>
          ))}
          <linearGradient id="bar-chrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6f6f8" />
            <stop offset="0.5" stopColor="#9a9ea8" />
            <stop offset="1" stopColor="#dcdfe4" />
          </linearGradient>
          <filter id="ball-blur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <clipPath id="dome-clip">
            <ellipse cx={ART_DOME.cx} cy={ART_DOME.cy} rx={ART_DOME.rx - 1} ry={ART_DOME.ry - 1} />
          </clipPath>
          <clipPath id="lid-clip">
            <rect x={-DROP_R - 2} y={-DROP_R - 2} width={DROP_R * 2 + 4} height={DROP_R + 2} />
          </clipPath>
        </defs>

        <g clipPath="url(#dome-clip)">
          {sim.caps.map((c, i) => (
            <circle key={i} ref={(el) => { capsRef.current[i] = el; }} r={CAP_R} fill={`url(#ball-${c.rarity})`} />
          ))}
        </g>

        {/* Manivela: barra cromada con topes, sobre el plato del dibujo */}
        <g ref={crank}>
          <rect x={ART_KNOB.cx - 11} y={ART_KNOB.cy - 1.8} width="22" height="3.6" rx="1.8" fill="url(#bar-chrome)" stroke="#3b3b3b" strokeWidth="0.4" />
          <circle cx={ART_KNOB.cx - 10} cy={ART_KNOB.cy} r="2.6" fill="url(#bar-chrome)" stroke="#3b3b3b" strokeWidth="0.4" />
          <circle cx={ART_KNOB.cx + 10} cy={ART_KNOB.cy} r="2.6" fill="url(#bar-chrome)" stroke="#3b3b3b" strokeWidth="0.4" />
          <circle cx={ART_KNOB.cx} cy={ART_KNOB.cy} r="1.4" fill="#2b2b2b" />
        </g>

        {/* Cápsula que sale por la boca */}
        <circle ref={glow} cx={ART_EXIT.x} cy={ART_EXIT.yRest} r="12" opacity="0" filter="url(#ball-blur)" />
        <g ref={drop} style={{ display: "none" }}>
          <ellipse cy={DROP_R + 1.5} rx={DROP_R * 0.9} ry="1.4" fill="#000" opacity="0.35" />
          <circle ref={dropBall} r={DROP_R} fill="url(#ball-comun)" />
          <path ref={dropLid} d={`M ${-DROP_R} 0 A ${DROP_R} ${DROP_R} 0 0 1 ${DROP_R} 0 Z`} fill="url(#ball-comun)" clipPath="url(#lid-clip)" />
        </g>
        <g ref={sparks}>
          {Array.from({ length: 40 }, (_, i) => <circle key={i} r="1" opacity="0" />)}
        </g>
      </svg>

      {/* Capa 3: reflejos del cristal, por encima de las bolas */}
      <svg viewBox={ART_VIEWBOX} className="machine pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <g dangerouslySetInnerHTML={{ __html: ART_GLASS }} />
      </svg>
    </div>
  );
});
