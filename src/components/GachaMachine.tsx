import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { mulberry32 } from "../game/hash";
import type { Rarity } from "../game/types";

/**
 * Máquina de cápsulas en SVG con animaciones imperativas (Web Animations API).
 * GachaStage la dirige por fases: turn() → drop(rareza) → open(). Cada método devuelve
 * una promesa que se resuelve cuando la animación termina; skip() salta al estado final.
 */
export interface MachineHandle {
  turn: () => Promise<void>;
  drop: (rarity: Rarity) => Promise<void>;
  open: () => Promise<void>;
  reset: () => void;
  skip: (rarity: Rarity) => void;
}

const W = 300;
const H = 420;
const DOME = { cx: 150, cy: 146, r: 116 };
const CAP_R = 17;
/** Dónde queda la cápsula en la bandeja (coordenadas del viewBox). */
const TRAY = { x: 211, y: 346 };
const DROP_START = { x: 206, y: 262 };

const DOME_MIX: Rarity[] = [
  "legendaria", "epica", "rara", "comun", "poco_comun", "comun", "rara", "comun", "poco_comun", "comun", "rara",
  "comun", "poco_comun", "comun", "comun", "poco_comun", "comun", "comun", "poco_comun", "comun", "poco_comun", "comun",
];

interface Props {
  dimmed?: boolean;
  idle?: boolean;
  className?: string;
}

export const GachaMachine = forwardRef<MachineHandle, Props>(function GachaMachine({ dimmed = false, idle = true, className = "" }, ref) {
  const capsules = useMemo(() => layoutCapsules(), []);
  const knob = useRef<SVGGElement>(null);
  const capsGroup = useRef<SVGGElement>(null);
  const drop = useRef<SVGGElement>(null);
  const dropTop = useRef<SVGGElement>(null);
  const flash = useRef<SVGCircleElement>(null);
  const sparks = useRef<SVGGElement>(null);
  const shadow = useRef<SVGEllipseElement>(null);
  const running = useRef<Animation[]>([]);

  const track = (a: Animation) => {
    running.current.push(a);
    return a;
  };
  /** Espera a que termine la animación, con un tope de tiempo: en una pestaña oculta las animaciones pueden no arrancar nunca. */
  const settle = (a: Animation, ms: number) =>
    Promise.race([a.finished.then(() => undefined, () => undefined), new Promise<void>((r) => window.setTimeout(r, ms + 120))]);
  const cancelAll = () => {
    running.current.forEach((a) => a.cancel());
    running.current = [];
  };
  const setCapsuleColor = (rarity: Rarity) => {
    drop.current?.style.setProperty("--cap", `var(--color-${rarity})`);
    flash.current?.style.setProperty("--cap", `var(--color-${rarity})`);
  };

  useImperativeHandle(ref, () => ({
    async turn() {
      cancelAll();
      const k = knob.current;
      const g = capsGroup.current;
      if (!k || !g) return;
      k.style.transform = "";
      // La manivela da una vuelta con un pequeño rebote al final.
      const knobAnim = track(k.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(390deg)", offset: 0.8 }, { transform: "rotate(360deg)" }],
        { duration: 700, easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "forwards" },
      ));
      // La masa de cápsulas gira y cada cápsula salta a su aire.
      track(g.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(-7deg)", offset: 0.3 }, { transform: "rotate(6deg)", offset: 0.65 }, { transform: "rotate(0deg)" }],
        { duration: 700, easing: "cubic-bezier(0.3, 0, 0.2, 1)" },
      ));
      const rng = mulberry32(Date.now() & 0xffff);
      g.querySelectorAll<SVGGElement>(".machine-cap").forEach((el) => {
        const frames = Array.from({ length: 6 }, (_, i) => ({
          transform: i === 0 || i === 5 ? "translate(0,0) rotate(0deg)" : `translate(${(rng() - 0.5) * 12}px, ${-rng() * 14}px) rotate(${(rng() - 0.5) * 50}deg)`,
        }));
        track(el.animate(frames, { duration: 650, delay: rng() * 90, easing: "ease-in-out" }));
      });
      await settle(knobAnim, 700);
    },

    async drop(rarity) {
      const d = drop.current;
      const sh = shadow.current;
      if (!d) return;
      setCapsuleColor(rarity);
      const at = (x: number, y: number, sx = 1, sy = 1) => `translate(${x}px, ${y}px) scale(${sx}, ${sy})`;
      // Caída con gravedad, aplastamiento al tocar la bandeja y dos rebotes decrecientes.
      // Nota: la opacidad va en todas las claves; si falta en una, WAAPI interpola hacia el valor base (0).
      const fall = track(d.animate(
        [
          { transform: at(DROP_START.x, DROP_START.y, 0.7, 0.7), opacity: 0, offset: 0 },
          { transform: at(DROP_START.x + 3, DROP_START.y + 10, 0.85, 0.85), opacity: 1, offset: 0.12 },
          { transform: at(TRAY.x, TRAY.y, 1, 1), opacity: 1, offset: 0.5, easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
          { transform: at(TRAY.x, TRAY.y + 3, 1.22, 0.78), opacity: 1, offset: 0.56 },
          { transform: at(TRAY.x, TRAY.y - 26, 0.96, 1.06), opacity: 1, offset: 0.72, easing: "cubic-bezier(0.55, 0, 1, 0.45)" },
          { transform: at(TRAY.x, TRAY.y + 1, 1.1, 0.9), opacity: 1, offset: 0.82 },
          { transform: at(TRAY.x, TRAY.y - 9, 1, 1), opacity: 1, offset: 0.9 },
          { transform: at(TRAY.x, TRAY.y, 1, 1), opacity: 1, offset: 1 },
        ],
        { duration: 900, easing: "linear", fill: "forwards" },
      ));
      if (sh) {
        track(sh.animate(
          [{ opacity: 0, transform: "scale(0.4)" }, { opacity: 0.55, transform: "scale(1)", offset: 0.5 }, { opacity: 0.25, transform: "scale(0.8)", offset: 0.72 }, { opacity: 0.5, transform: "scale(1)" }],
          { duration: 900, fill: "forwards" },
        ));
      }
      await settle(fall, 900);
    },

    async open() {
      const f = flash.current;
      const top = dropTop.current;
      if (!f || !top) return;
      // Latido de anticipación con el color de la rareza.
      const pulse = track(f.animate(
        [{ opacity: 0, transform: "scale(0.5)" }, { opacity: 0.8, transform: "scale(1.1)", offset: 0.35 }, { opacity: 0.15, transform: "scale(0.9)", offset: 0.6 }, { opacity: 0.9, transform: "scale(1.5)", offset: 0.85 }, { opacity: 0, transform: "scale(2.2)" }],
        { duration: 720, easing: "ease-out", fill: "forwards" },
      ));
      await settle(pulse, 720);
      // La tapa sale despedida y saltan partículas.
      const lid = track(top.animate(
        [{ transform: "translate(0,0) rotate(0deg)", opacity: 1 }, { transform: "translate(-22px,-54px) rotate(-75deg)", opacity: 0 }],
        { duration: 460, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
      ));
      spawnSparks(sparks.current, track);
      await settle(lid, 460);
    },

    // Los estados finales se fijan con estilos en línea tras cancelar las animaciones
    // (una animación con fill:forwards pisaría el estilo en línea).
    reset() {
      cancelAll();
      if (drop.current) {
        drop.current.style.opacity = "0";
        drop.current.style.transform = `translate(${DROP_START.x}px, ${DROP_START.y}px) scale(0.7)`;
      }
      if (dropTop.current) {
        dropTop.current.style.transform = "";
        dropTop.current.style.opacity = "";
      }
      if (shadow.current) shadow.current.style.opacity = "0";
      if (flash.current) flash.current.style.opacity = "0";
      sparks.current?.replaceChildren();
    },

    skip(rarity) {
      cancelAll();
      setCapsuleColor(rarity);
      if (knob.current) knob.current.style.transform = "rotate(360deg)";
      if (drop.current) {
        drop.current.style.opacity = "1";
        drop.current.style.transform = `translate(${TRAY.x}px, ${TRAY.y}px) scale(1)`;
      }
      if (dropTop.current) {
        dropTop.current.style.transform = "translate(-22px,-54px) rotate(-75deg)";
        dropTop.current.style.opacity = "0";
      }
      if (shadow.current) shadow.current.style.opacity = "0.5";
      if (flash.current) flash.current.style.opacity = "0";
      sparks.current?.replaceChildren();
    },
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`machine ${dimmed ? "machine-dimmed" : ""} ${idle ? "machine-caps-idle" : ""} ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id="m-dome-in" cx="50%" cy="60%" r="60%">
          <stop offset="0" stopColor="oklch(0.3 0 0)" />
          <stop offset="1" stopColor="oklch(0.14 0 0)" />
        </radialGradient>
        <radialGradient id="m-glass" cx="30%" cy="22%" r="75%">
          <stop offset="0" stopColor="white" stopOpacity="0.5" />
          <stop offset="0.35" stopColor="white" stopOpacity="0.1" />
          <stop offset="0.8" stopColor="white" stopOpacity="0.02" />
          <stop offset="1" stopColor="white" stopOpacity="0.18" />
        </radialGradient>
        <linearGradient id="m-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.34 0 0)" />
          <stop offset="0.5" stopColor="oklch(0.24 0 0)" />
          <stop offset="1" stopColor="oklch(0.17 0 0)" />
        </linearGradient>
        <linearGradient id="m-ring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="oklch(0.62 0 0)" />
          <stop offset="0.45" stopColor="oklch(0.36 0 0)" />
          <stop offset="1" stopColor="oklch(0.5 0 0)" />
        </linearGradient>
        <radialGradient id="m-chrome" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="oklch(0.98 0 0)" />
          <stop offset="0.5" stopColor="oklch(0.78 0 0)" />
          <stop offset="1" stopColor="oklch(0.45 0 0)" />
        </radialGradient>
        <radialGradient id="m-cap-shine" cx="35%" cy="28%" r="70%">
          <stop offset="0" stopColor="white" stopOpacity="0.75" />
          <stop offset="0.4" stopColor="white" stopOpacity="0.12" />
          <stop offset="1" stopColor="black" stopOpacity="0.25" />
        </radialGradient>
        <linearGradient id="m-window" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
          <stop offset="1" stopColor="white" stopOpacity="0.1" />
        </linearGradient>
        <clipPath id="m-dome-clip">
          <circle cx={DOME.cx} cy={DOME.cy} r={DOME.r - 5} />
        </clipPath>
        <filter id="m-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Suelo */}
      <ellipse cx="150" cy="410" rx="104" ry="8" fill="oklch(0 0 0 / 0.6)" filter="url(#m-soft)" />

      {/* Cuerpo */}
      <rect x="48" y="268" width="204" height="138" rx="22" fill="url(#m-body)" />
      <rect x="48" y="268" width="204" height="138" rx="22" fill="none" stroke="white" strokeOpacity="0.12" strokeWidth="1.5" />
      <rect x="60" y="280" width="180" height="3" rx="1.5" fill="white" fillOpacity="0.12" />
      <rect x="40" y="396" width="220" height="12" rx="6" fill="oklch(0.14 0 0)" />

      {/* Anillo base de la cúpula */}
      <rect x="36" y="250" width="228" height="26" rx="10" fill="url(#m-ring)" />
      <rect x="36" y="250" width="228" height="26" rx="10" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

      {/* Manivela cromada (izquierda) */}
      <circle cx="104" cy="322" r="31" fill="oklch(0.12 0 0)" />
      <g ref={knob} className="machine-knob">
        <circle cx="104" cy="322" r="27" fill="url(#m-chrome)" />
        <circle cx="104" cy="322" r="27" fill="none" stroke="oklch(0.3 0 0)" strokeWidth="1.5" />
        <rect x="99" y="298" width="10" height="48" rx="5" fill="oklch(0.22 0 0)" />
        <rect x="100.5" y="300" width="3" height="44" rx="1.5" fill="white" fillOpacity="0.25" />
        <circle cx="104" cy="322" r="4.5" fill="oklch(0.2 0 0)" />
      </g>

      {/* Ventana de salida (derecha): hueco oscuro, la cápsula cae por dentro, cristal encima */}
      <rect x="184" y="272" width="56" height="96" rx="14" fill="oklch(0.07 0 0)" />
      <ellipse ref={shadow} cx={TRAY.x} cy={TRAY.y + 18} rx="17" ry="4" fill="black" opacity="0" style={{ transformBox: "fill-box", transformOrigin: "center" }} />

      <g ref={drop} className="machine-drop" style={{ opacity: 0, transform: `translate(${DROP_START.x}px, ${DROP_START.y}px) scale(0.7)` }}>
        <circle ref={flash} className="machine-flash" cx="0" cy="0" r="34" fill="var(--cap, var(--color-comun))" opacity="0" filter="url(#m-soft)" />
        <CapsuleShape r={CAP_R + 3} topRef={dropTop} />
      </g>
      <g ref={sparks} className="machine-sparks" />

      <rect x="184" y="272" width="56" height="96" rx="14" fill="url(#m-window)" pointerEvents="none" />
      <rect x="184" y="272" width="56" height="96" rx="14" fill="none" stroke="white" strokeOpacity="0.22" strokeWidth="1.5" />
      <rect x="178" y="364" width="68" height="12" rx="5" fill="url(#m-ring)" />

      {/* Cúpula: interior, cápsulas y cristal */}
      <circle cx={DOME.cx} cy={DOME.cy} r={DOME.r} fill="url(#m-dome-in)" />
      <g ref={capsGroup} className="machine-caps" clipPath="url(#m-dome-clip)">
        {capsules.map((c, i) => (
          // Grupo exterior: posición (atributo). Grupo interior: animaciones (CSS/WAAPI), que no pisan la posición.
          <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.tilt})`}>
            <g className="machine-cap" style={{ animationDelay: `${(i % 7) * -0.5}s` }}>
              <CapsuleShape r={CAP_R} color={`var(--color-${c.rarity})`} />
            </g>
          </g>
        ))}
      </g>
      <circle cx={DOME.cx} cy={DOME.cy} r={DOME.r} fill="url(#m-glass)" stroke="white" strokeOpacity="0.28" strokeWidth="3" />
      <ellipse cx="108" cy="86" rx="20" ry="46" fill="white" fillOpacity="0.28" transform="rotate(-28 108 86)" />
      <ellipse cx="206" cy="214" rx="8" ry="22" fill="white" fillOpacity="0.1" transform="rotate(-30 206 214)" />
    </svg>
  );
});

/** Cápsula brillante: mitad superior de color, inferior translúcida. `topRef` permite animar la tapa. */
function CapsuleShape({ r, color = "var(--cap, var(--color-comun))", topRef }: { r: number; color?: string; topRef?: React.RefObject<SVGGElement | null> }) {
  return (
    <>
      <path d={`M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0 Z`} fill="oklch(0.92 0 0 / 0.92)" />
      <path d={`M ${-r} 0 A ${r} ${r} 0 0 0 ${r} 0 Z`} fill="url(#m-cap-shine)" />
      <g ref={topRef} className="machine-drop-top" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        <path d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 Z`} fill={color} />
        <path d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 Z`} fill="url(#m-cap-shine)" />
        <rect x={-r} y={-1.2} width={r * 2} height={2.4} fill="black" fillOpacity="0.25" />
      </g>
    </>
  );
}

/** Partículas al abrir la cápsula, con el color de la rareza. */
function spawnSparks(container: SVGGElement | null, track: (a: Animation) => Animation) {
  if (!container) return;
  container.replaceChildren();
  const rng = mulberry32(Date.now() & 0xffff);
  const n = 14;
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const r = 1.5 + rng() * 2.5;
    c.setAttribute("r", String(r));
    c.setAttribute("cx", String(TRAY.x));
    c.setAttribute("cy", String(TRAY.y - 6));
    c.setAttribute("fill", "var(--cap, white)");
    c.style.setProperty("--cap", container.parentElement?.querySelector<SVGGElement>(".machine-drop")?.style.getPropertyValue("--cap") || "white");
    c.classList.add("machine-spark");
    container.appendChild(c);
    const angle = -Math.PI / 2 + (rng() - 0.5) * Math.PI * 0.9;
    const speed = 40 + rng() * 70;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    track(c.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${vx * 0.55}px, ${vy * 0.55 + 12}px) scale(0.9)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${vx}px, ${vy + 70}px) scale(0.2)`, opacity: 0 },
      ],
      { duration: 650 + rng() * 300, easing: "cubic-bezier(0.2, 0.6, 0.4, 1)", fill: "forwards" },
    ));
  }
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
    const y = DOME.cy + 16 + Math.sin(a) * d;
    if (y < DOME.cy - 66 || Math.hypot(x - DOME.cx, y - DOME.cy) > limit) continue;
    if (out.some((c) => Math.hypot(c.x - x, c.y - y) < CAP_R * 2 - 1)) continue;
    out.push({ x, y, rarity: DOME_MIX[out.length], tilt: Math.round((rng() - 0.5) * 70) });
  }
  return out;
}
