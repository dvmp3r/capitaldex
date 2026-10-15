import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { mulberry32 } from "../../game/hash";
import type { Rarity } from "../../game/types";

/** Misma interfaz que las máquinas anteriores: GachaStage la dirige por fases. */
export interface MachineHandle {
  turn: () => Promise<void>;
  drop: (rarity: Rarity) => Promise<void>;
  open: () => Promise<void>;
  reset: () => void;
  skip: (rarity: Rarity) => void;
}

/* ---------- Lienzo y paleta ---------- */

const W = 60;
const H = 84;
const FPS = 12;

const P = {
  outline: "#0b0b10",
  glass: "#2b3550",
  glassDark: "#1a2238",
  glassLine: "#8fb3d9",
  glassHi: "#e8f4ff",
  chrome1: "#f2f4f8",
  chrome2: "#b7bdc9",
  chrome3: "#6f7684",
  body1: "#4a4c55",
  body2: "#30323a",
  body3: "#1d1e24",
  panel: "#262830",
  hole: "#07070a",
  tray: "#9aa1ad",
  shadow: "#000000",
};

/** Colores de cápsula por rareza: [claro, medio, oscuro]. */
const CAPSULE: Record<Rarity, [string, string, string]> = {
  comun: ["#d9dde3", "#9aa3ad", "#5c636d"],
  poco_comun: ["#9ff0b5", "#2ad46f", "#13813f"],
  rara: ["#9cc4ff", "#3b82f6", "#1f4fa8"],
  epica: ["#d9b3ff", "#a855f7", "#6a2fb0"],
  legendaria: ["#ffe9a6", "#f5b921", "#a8740c"],
};

type Phase = "idle" | "turning" | "dropping" | "opening" | "revealed";

interface State {
  phase: Phase;
  since: number; // ms de inicio de la fase
  rarity: Rarity;
}

/* ---------- Pintor de píxeles ---------- */

class Px {
  constructor(private ctx: CanvasRenderingContext2D) {}
  dot(x: number, y: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }
  hline(x0: number, x1: number, y: number, c: string) {
    this.rect(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, c);
  }
  /** Círculo relleno con contorno opcional, al estilo pixel art (sin antialias). */
  circle(cx: number, cy: number, r: number, fill: string, outline?: string) {
    const R2 = (r + 0.5) * (r + 0.5);
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(R2 - y * y));
      this.hline(cx - half, cx + half, cy + y, fill);
    }
    if (outline) {
      for (let y = -r; y <= r; y++) {
        const half = Math.floor(Math.sqrt(R2 - y * y));
        const prev = Math.floor(Math.sqrt(Math.max(0, R2 - (Math.abs(y) + 1) ** 2)));
        this.dot(cx - half, cy + y, outline);
        this.dot(cx + half, cy + y, outline);
        for (let x = prev + 1; x < half; x++) {
          this.dot(cx - x, cy + y, outline);
          this.dot(cx + x, cy + y, outline);
        }
      }
    }
  }
  /** Cápsula de dos tonos con brillo, de diámetro `d` (impar). */
  capsule(cx: number, cy: number, d: number, col: [string, string, string], squash = 1, lidOffset = 0) {
    const r = Math.floor(d / 2);
    const ry = Math.max(1, Math.round(r * squash));
    const rx = Math.max(1, Math.round(r * (2 - squash)));
    for (let y = -ry; y <= ry; y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, (rx + 0.5) * (rx + 0.5) * (1 - (y * y) / ((ry + 0.5) * (ry + 0.5))))));
      const top = y < 0;
      const yy = cy + y - (top ? lidOffset : 0);
      this.hline(cx - half, cx + half, yy, top ? col[1] : col[2]);
      if (y === 0 && lidOffset === 0) this.hline(cx - half, cx + half, yy, col[2]);
    }
    // brillo arriba a la izquierda y contorno
    this.dot(cx - Math.ceil(rx / 2), cy - Math.ceil(ry / 2) - lidOffset, col[0]);
    if (rx >= 3) this.dot(cx - Math.ceil(rx / 2) + 1, cy - Math.ceil(ry / 2) - lidOffset, col[0]);
  }
}

/* ---------- Escena ---------- */

const DOME = { cx: 30, cy: 26, r: 20 };
const TRAY_Y = 68; // centro de la cápsula en reposo
const WINDOW = { x: 33, y: 54, w: 13, h: 17 };
const DROP_X = 39;

function layoutCapsules(): { x: number; y: number; rarity: Rarity }[] {
  const mix: Rarity[] = ["comun", "poco_comun", "comun", "rara", "comun", "comun", "epica", "comun", "poco_comun", "comun", "legendaria", "comun", "rara", "poco_comun", "comun", "comun", "rara", "poco_comun", "comun", "comun", "poco_comun", "comun"];
  const out: { x: number; y: number; rarity: Rarity }[] = [];
  // Filas apiladas de abajo arriba, con desplazamiento alterno (empaquetado hexagonal).
  let row = 0;
  for (let y = DOME.cy + DOME.r - 6; y > DOME.cy - 2 && out.length < mix.length; y -= 6, row++) {
    const offset = row % 2 ? 3 : 0;
    for (let x = DOME.cx - 18 + offset; x <= DOME.cx + 18 && out.length < mix.length; x += 7) {
      if (Math.hypot(x - DOME.cx, y - DOME.cy) > DOME.r - 5) continue;
      out.push({ x, y, rarity: mix[out.length] });
    }
  }
  return out;
}

function draw(px: Px, st: State, now: number, caps: ReturnType<typeof layoutCapsules>, rng: () => number) {
  const t = (now - st.since) / 1000;
  const frame = Math.floor(now / (1000 / FPS));
  const ph = st.phase;

  // Sombra en el suelo y peana
  px.rect(8, 80, 44, 2, "#111117");
  px.rect(6, 76, 48, 4, P.body3);
  px.hline(6, 53, 76, P.body2);

  // Cuerpo
  px.rect(10, 50, 40, 27, P.outline);
  px.rect(11, 51, 38, 25, P.body2);
  px.hline(11, 48, 51, P.body1);
  px.rect(11, 51, 1, 25, P.body1);
  px.rect(48, 51, 1, 25, P.body3);
  px.hline(11, 48, 75, P.body3);
  // Panel frontal
  px.rect(13, 53, 34, 21, P.panel);

  // Manivela (gira en 4 posiciones)
  const crankFrame = ph === "turning" ? Math.floor(t * 8) % 4 : 0;
  px.circle(21, 63, 6, P.chrome2, P.outline);
  px.circle(21, 63, 4, P.chrome3);
  px.dot(19, 61, P.chrome1);
  px.dot(20, 61, P.chrome1);
  const bars: [number, number][][] = [
    [[21, 58], [21, 59], [21, 60], [21, 66], [21, 67], [21, 68]],
    [[17, 59], [18, 60], [19, 61], [23, 65], [24, 66], [25, 67]],
    [[16, 63], [17, 63], [18, 63], [24, 63], [25, 63], [26, 63]],
    [[17, 67], [18, 66], [19, 65], [23, 61], [24, 60], [25, 59]],
  ];
  for (const [x, y] of bars[crankFrame]) px.dot(x, y, P.chrome1);
  px.dot(21, 63, P.body3);

  // Ventana de salida: hueco, marco y bandeja
  px.rect(WINDOW.x - 1, WINDOW.y - 1, WINDOW.w + 2, WINDOW.h + 2, P.outline);
  px.rect(WINDOW.x, WINDOW.y, WINDOW.w, WINDOW.h, P.hole);
  px.rect(WINDOW.x, WINDOW.y + WINDOW.h - 3, WINDOW.w, 3, P.tray);
  px.hline(WINDOW.x, WINDOW.x + WINDOW.w - 1, WINDOW.y + WINDOW.h - 3, P.chrome1);
  px.rect(WINDOW.x, WINDOW.y, 1, WINDOW.h - 3, P.glassLine);
  px.dot(WINDOW.x + 1, WINDOW.y + 1, P.glassHi);

  // Cápsula que cae
  if (ph === "dropping" || ph === "opening" || ph === "revealed") {
    const col = CAPSULE[st.rarity];
    let y = TRAY_Y;
    let squash = 1;
    if (ph === "dropping") {
      // caída 0-0,45 s, rebote hasta 0,9 s
      const yStart = WINDOW.y + 3;
      if (t < 0.45) {
        const k = t / 0.45;
        y = yStart + (TRAY_Y - yStart) * k * k;
      } else if (t < 0.65) {
        const k = (t - 0.45) / 0.2;
        y = TRAY_Y - 6 * Math.sin(k * Math.PI);
        squash = k < 0.1 ? 0.6 : 1;
      } else if (t < 0.8) {
        const k = (t - 0.65) / 0.15;
        y = TRAY_Y - 2 * Math.sin(k * Math.PI);
      }
    }
    let lid = 0;
    let glow = 0;
    if (ph === "opening") {
      glow = t < 0.5 ? Math.abs(Math.sin(t * Math.PI * 4)) : 0;
      lid = t < 0.5 ? 0 : Math.min(4, Math.floor((t - 0.5) * 16));
    }
    if (ph === "revealed") lid = 4;
    if (glow > 0.5) {
      px.rect(WINDOW.x + 1, WINDOW.y + 1, WINDOW.w - 2, WINDOW.h - 4, col[2]);
    }
    px.capsule(DROP_X, Math.round(y), 7, col, squash, lid);
    // chispas al abrir
    if ((ph === "opening" && t > 0.5) || (ph === "revealed" && t < 0.6)) {
      const n = st.rarity === "legendaria" ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + frame * 0.1;
        const d = 4 + ((frame + i) % 4);
        px.dot(DROP_X + Math.cos(a) * d, TRAY_Y - 4 + Math.sin(a) * d * 0.6 - ((frame + i) % 3), i % 2 ? col[0] : col[1]);
      }
    }
  }

  // Collar
  px.rect(8, 46, 44, 5, P.outline);
  px.rect(9, 47, 42, 3, P.chrome2);
  px.hline(9, 50, 47, P.chrome1);
  px.hline(9, 50, 49, P.chrome3);

  // Cúpula
  px.circle(DOME.cx, DOME.cy, DOME.r, P.glass, P.glassLine);
  px.circle(DOME.cx, DOME.cy + 4, DOME.r - 3, P.glassDark);

  // Cápsulas dentro (sacudida al girar)
  const shaking = ph === "turning";
  for (let i = 0; i < caps.length; i++) {
    const c = caps[i];
    let dx = 0;
    let dy = 0;
    if (shaking) {
      dx = Math.round((rng() - 0.5) * 3);
      dy = -Math.round(rng() * 4);
    } else if (ph === "idle" || ph === "revealed") {
      dy = (frame + i) % 24 === 0 ? -1 : 0;
    }
    px.capsule(c.x + dx, c.y + dy, 7, CAPSULE[c.rarity]);
  }

  // Brillos del cristal (encima de todo)
  px.hline(17, 20, 13, P.glassHi);
  px.hline(15, 18, 14, P.glassHi);
  px.dot(14, 16, P.glassHi);
  px.dot(13, 18, P.glassHi);
  px.dot(43, 38, P.glassLine);
  px.dot(44, 36, P.glassLine);

}

/* ---------- Componente ---------- */

interface Props {
  dimmed?: boolean;
  idle?: boolean;
  className?: string;
}

export const PixelMachine = forwardRef<MachineHandle, Props>(function PixelMachine({ dimmed = false, className = "" }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef<State>({ phase: "idle", since: performance.now(), rarity: "comun" });
  const caps = useMemo(() => layoutCapsules(), []);
  const rng = useMemo(() => mulberry32(99), []);

  const setPhase = (phase: Phase, rarity?: Rarity) => {
    state.current = { phase, since: performance.now(), rarity: rarity ?? state.current.rarity };
  };
  const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

  useImperativeHandle(ref, () => ({
    turn: async () => {
      setPhase("turning");
      await wait(700);
    },
    drop: async (rarity) => {
      setPhase("dropping", rarity);
      await wait(900);
    },
    open: async () => {
      setPhase("opening");
      await wait(850);
    },
    reset: () => setPhase("idle"),
    skip: (rarity) => setPhase("revealed", rarity),
  }));

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const px = new Px(ctx);
    let id = 0;
    let lastFrame = -1;
    const loop = (now: number) => {
      const frame = Math.floor(now / (1000 / FPS));
      if (frame !== lastFrame) {
        lastFrame = frame;
        ctx.clearRect(0, 0, W, H);
        draw(px, state.current, now, caps, rng);
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [caps, rng]);

  return (
    <div className={`${dimmed ? "machine-dimmed" : ""} ${className}`}>
      <canvas ref={canvas} width={W} height={H} className="pixel-canvas mx-auto h-full w-full" aria-hidden="true" />
    </div>
  );
});
