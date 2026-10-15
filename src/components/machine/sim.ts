import { mulberry32 } from "../../game/hash";
import type { Rarity } from "../../game/types";

/**
 * Simulación de la máquina de cápsulas, sin dependencias de three.js.
 * Unidades: 1 = ~10 cm. El origen está en el suelo, bajo el centro de la máquina.
 * La escena 3D lee este estado en cada fotograma; las fases (turn/drop/open) devuelven promesas.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Capsule {
  p: Vec3;
  v: Vec3;
  rot: Vec3; // ángulos de Euler acumulados por el rodar
  rarity: Rarity;
}

export interface DropState {
  active: boolean;
  rarity: Rarity;
  p: Vec3;
  v: Vec3;
  scale: Vec3;
  bounces: number;
  settled: boolean;
  lid: number; // 0 cerrada → 1 abierta
  glow: number; // 0..1 intensidad del latido
}

export interface Particle {
  p: Vec3;
  v: Vec3;
  life: number; // 1 → 0
  size: number;
}

/** Vitrina (caja) donde viven las cápsulas; `dome` es su esfera envolvente, para la ilustración 2D de respaldo. */
const CHAMBER = { min: { x: -0.93, y: 2.08, z: -0.66 }, max: { x: 0.93, y: 3.5, z: 0.66 } };
export const GEOM = {
  chamber: CHAMBER,
  dome: {
    c: { x: 0, y: (CHAMBER.min.y + CHAMBER.max.y) / 2, z: 0 },
    r: Math.hypot(CHAMBER.max.x, (CHAMBER.max.y - CHAMBER.min.y) / 2, CHAMBER.max.z),
  },
  capR: 0.15,
  dropR: 0.19,
  /** La cápsula aparece dentro de la boca de salida, rueda hacia delante y cae a la bandeja del pie. */
  spawn: { x: 0, y: 0.95, z: 0.55 },
  dropVel: { x: 0, y: -0.2, z: 1.7 },
  dropZMax: 1.08,
  trayY: 0.28,
  crankDuration: 0.75,
  stirDuration: 0.85,
};

const GRAVITY = 9;
const CAP_COUNT = 64;
/** Mezcla decorativa de la vitrina (más colorida que las probabilidades reales, que se muestran aparte). */
const DOME_MIX: Rarity[] = [
  "legendaria", "epica", "rara", "rara", "poco_comun", "poco_comun", "comun", "comun", "comun",
  "epica", "rara", "poco_comun", "comun", "legendaria", "rara", "poco_comun", "comun", "comun",
];

const v3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });
const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);

export class GachaSim {
  caps: Capsule[] = [];
  crank = { angle: 0, from: 0, to: 0, t: 1 };
  stir = 0;
  capsule: DropState = { active: false, rarity: "comun", p: v3(), v: v3(), scale: v3(1, 1, 1), bounces: 0, settled: false, lid: 0, glow: 0 };
  particles: Particle[] = [];
  time = 0;
  private rng = mulberry32(7);
  private timers: { at: number; resolve: () => void }[] = [];
  /** Hasta cuándo se considera agitada la vitrina (para seguir dibujando tras una sacudida). */
  private shakeUntil = 0;
  private glowPhase: { start: number; dur: number } | null = null;
  private lidPhase: { start: number; dur: number } | null = null;

  constructor() {
    this.seedCapsules();
    // Dejar que las cápsulas se asienten antes de que se vea la máquina.
    for (let i = 0; i < 90; i++) this.step(1 / 60);
  }

  private seedCapsules() {
    const { min, max } = GEOM.chamber;
    const r = GEOM.capR;
    this.caps = [];
    for (let i = 0; i < CAP_COUNT; i++) {
      this.caps.push({
        p: v3(min.x + r + this.rng() * (max.x - min.x - 2 * r), min.y + r + this.rng() * (max.y - min.y - 2 * r), min.z + r + this.rng() * (max.z - min.z - 2 * r)),
        v: v3(),
        rot: v3(this.rng() * 6, this.rng() * 6, this.rng() * 6),
        rarity: DOME_MIX[i % DOME_MIX.length],
      });
    }
  }

  /** ¿Hay algo moviéndose o alguna fase pendiente? (la escena baja los fps cuando no) */
  busy(): boolean {
    return this.time < this.shakeUntil || this.stir > 0 || this.crank.t < 1 || (this.capsule.active && !this.capsule.settled) || this.particles.length > 0 || this.capsule.glow > 0.01 || this.timers.length > 0;
  }

  /** Sacudida visual: empuja todas las cápsulas (con algo de azar) y mantiene la escena viva unos segundos. */
  nudge(ax: number, ay: number, az: number) {
    for (const b of this.caps) {
      b.v.x += ax * (0.6 + this.rng() * 0.8);
      b.v.y += ay * (0.6 + this.rng() * 0.8);
      b.v.z += az * (0.6 + this.rng() * 0.8);
      const sp = Math.hypot(b.v.x, b.v.y, b.v.z);
      if (sp > 7) { b.v.x *= 7 / sp; b.v.y *= 7 / sp; b.v.z *= 7 / sp; }
    }
    this.shakeUntil = this.time + 3;
  }

  /** Promesa que se resuelve cuando el reloj de la simulación llegue a `seconds` desde ahora. */
  private after(seconds: number) {
    return new Promise<void>((resolve) => this.timers.push({ at: this.time + seconds, resolve }));
  }

  turn(): Promise<void> {
    this.crank = { angle: this.crank.angle, from: this.crank.angle, to: this.crank.angle + Math.PI * 2, t: 0 };
    this.stir = GEOM.stirDuration;
    return this.after(GEOM.crankDuration + 0.1);
  }

  drop(rarity: Rarity): Promise<void> {
    this.capsule = {
      active: true,
      rarity,
      p: { ...GEOM.spawn },
      v: v3(GEOM.dropVel.x + (this.rng() - 0.5) * 0.2, GEOM.dropVel.y, GEOM.dropVel.z),
      scale: v3(0.7, 0.7, 0.7),
      bounces: 0,
      settled: false,
      lid: 0,
      glow: 0.35,
    };
    return new Promise<void>((resolve) => {
      const check = () => {
        if (this.capsule.settled || this.time > start + 1.6) resolve();
        else this.timers.push({ at: this.time + 0.05, resolve: check });
      };
      const start = this.time;
      this.timers.push({ at: this.time + 0.3, resolve: check });
    });
  }

  open(): Promise<void> {
    this.glowPhase = { start: this.time, dur: 0.6 };
    this.lidPhase = { start: this.time + 0.55, dur: 0.45 };
    return this.after(1.05);
  }

  reset() {
    this.timers = [];
    this.glowPhase = null;
    this.lidPhase = null;
    this.particles = [];
    this.capsule = { ...this.capsule, active: false, settled: false, bounces: 0, lid: 0, glow: 0, scale: v3(1, 1, 1) };
  }

  skip(rarity: Rarity) {
    this.timers = [];
    this.glowPhase = null;
    this.lidPhase = null;
    this.stir = 0;
    this.crank = { angle: this.crank.to, from: this.crank.to, to: this.crank.to, t: 1 };
    this.capsule = {
      active: true,
      rarity,
      p: v3(GEOM.spawn.x, GEOM.trayY + GEOM.dropR, GEOM.dropZMax),
      v: v3(),
      scale: v3(1, 1, 1),
      bounces: 2,
      settled: true,
      lid: 1,
      glow: 0,
    };
    this.particles = [];
  }

  /** Avanza la simulación `dt` segundos. */
  step(dt: number) {
    dt = Math.min(dt, 1 / 30);
    this.time += dt;

    // Manivela
    if (this.crank.t < 1) {
      this.crank.t = Math.min(1, this.crank.t + dt / GEOM.crankDuration);
      const k = ease(this.crank.t);
      const overshoot = Math.sin(this.crank.t * Math.PI) * 0.18; // pequeño rebote
      this.crank.angle = this.crank.from + (this.crank.to - this.crank.from) * k + overshoot;
    }

    // Cápsulas de la cúpula (dos subpasos para que las colisiones no exploten)
    const sub = 2;
    for (let s = 0; s < sub; s++) this.stepCapsules(dt / sub);
    if (this.stir > 0) this.stir -= dt;

    // Cápsula que cae
    if (this.capsule.active && !this.capsule.settled) this.stepDrop(dt);
    if (this.capsule.active) {
      // recupera la forma tras el aplastamiento
      const sc = this.capsule.scale;
      sc.x += (1 - sc.x) * Math.min(1, dt * 14);
      sc.y += (1 - sc.y) * Math.min(1, dt * 14);
      sc.z += (1 - sc.z) * Math.min(1, dt * 14);
    }

    // Latido y tapa
    if (this.glowPhase) {
      const t = (this.time - this.glowPhase.start) / this.glowPhase.dur;
      this.capsule.glow = t >= 1 ? 1 : 0.35 + 0.65 * Math.abs(Math.sin(t * Math.PI * 2.5));
      if (t >= 1) this.glowPhase = null;
    } else if (this.capsule.active && this.capsule.lid > 0) {
      this.capsule.glow = Math.max(0, this.capsule.glow - dt * 1.5);
    }
    if (this.lidPhase && this.time >= this.lidPhase.start) {
      const t = Math.min(1, (this.time - this.lidPhase.start) / this.lidPhase.dur);
      if (this.capsule.lid === 0) this.spawnParticles();
      this.capsule.lid = ease(t);
      if (t >= 1) this.lidPhase = null;
    }

    // Partículas
    for (const pt of this.particles) {
      pt.v.y -= 6 * dt;
      pt.p.x += pt.v.x * dt;
      pt.p.y += pt.v.y * dt;
      pt.p.z += pt.v.z * dt;
      pt.life -= dt / 0.9;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);

    // Temporizadores
    const due = this.timers.filter((t) => t.at <= this.time);
    this.timers = this.timers.filter((t) => t.at > this.time);
    due.forEach((t) => t.resolve());
  }

  private stepCapsules(dt: number) {
    const { min } = GEOM.chamber;
    const c = GEOM.dome.c;
    const r = GEOM.capR;
    const stirring = this.stir > 0;
    for (const b of this.caps) {
      b.v.y -= GRAVITY * dt;
      if (stirring) {
        // remolino alrededor del eje vertical + sacudida hacia arriba
        const dx = b.p.x - c.x;
        const dz = b.p.z - c.z;
        const len = Math.hypot(dx, dz) || 1;
        const k = this.stir / GEOM.stirDuration;
        b.v.x += (-dz / len) * 9 * k * dt + (this.rng() - 0.5) * 3 * dt;
        b.v.z += (dx / len) * 9 * k * dt + (this.rng() - 0.5) * 3 * dt;
        b.v.y += (5 + this.rng() * 6) * k * dt;
      }
      b.p.x += b.v.x * dt;
      b.p.y += b.v.y * dt;
      b.p.z += b.v.z * dt;
      // Paredes de la vitrina
      this.constrainToChamber(b, true);
      // rodar: giro proporcional a la velocidad
      b.rot.x += (b.v.z / r) * dt;
      b.rot.z -= (b.v.x / r) * dt;
      // reposo (sobre el suelo o sobre otra cápsula quieta)
      if (!stirring && Math.hypot(b.v.x, b.v.y, b.v.z) < 0.05 && b.p.y < min.y + r + 0.01) {
        b.v.x = b.v.y = b.v.z = 0;
      }
    }
    // Colisiones entre cápsulas (masas iguales)
    for (let i = 0; i < this.caps.length; i++) {
      for (let j = i + 1; j < this.caps.length; j++) {
        const a = this.caps[i];
        const b = this.caps[j];
        const dx = b.p.x - a.p.x;
        const dy = b.p.y - a.p.y;
        const dz = b.p.z - a.p.z;
        const dist = Math.hypot(dx, dy, dz) || 1e-6;
        const min = r * 2;
        if (dist < min) {
          const ux = dx / dist;
          const uy = dy / dist;
          const uz = dz / dist;
          const push = (min - dist) / 2;
          a.p.x -= ux * push;
          a.p.y -= uy * push;
          a.p.z -= uz * push;
          b.p.x += ux * push;
          b.p.y += uy * push;
          b.p.z += uz * push;
          const rel = (b.v.x - a.v.x) * ux + (b.v.y - a.v.y) * uy + (b.v.z - a.v.z) * uz;
          if (rel < 0) {
            const jimp = (-(1 + 0.2) * rel) / 2;
            a.v.x -= ux * jimp;
            a.v.y -= uy * jimp;
            a.v.z -= uz * jimp;
            b.v.x += ux * jimp;
            b.v.y += uy * jimp;
            b.v.z += uz * jimp;
          }
        }
      }
    }
    for (const b of this.caps) this.constrainToChamber(b, false);
  }

  /** Mantiene la cápsula dentro de la vitrina; con `bounce` refleja la velocidad al chocar con una pared. */
  private constrainToChamber(b: Capsule, bounce: boolean) {
    const { min, max } = GEOM.chamber;
    const r = GEOM.capR;
    const e = 0.25;
    const axes = ["x", "y", "z"] as const;
    for (const k of axes) {
      if (b.p[k] < min[k] + r) {
        b.p[k] = min[k] + r;
        if (bounce && b.v[k] < 0) b.v[k] = -b.v[k] * e;
        if (bounce && k === "y") { b.v.x *= 0.94; b.v.z *= 0.94; }
      } else if (b.p[k] > max[k] - r) {
        b.p[k] = max[k] - r;
        if (bounce && b.v[k] > 0) b.v[k] = -b.v[k] * e;
      }
    }
  }

  private stepDrop(dt: number) {
    const d = this.capsule;
    const rest = GEOM.trayY + GEOM.dropR;
    d.v.y -= GRAVITY * dt;
    d.p.x += d.v.x * dt;
    d.p.y += d.v.y * dt;
    d.p.z += d.v.z * dt;
    // crece al salir de la boca
    d.scale.x = d.scale.y = d.scale.z = Math.min(1, d.scale.x + dt * 3);
    // tope delantero de la bandeja
    if (d.p.z > GEOM.dropZMax) {
      d.p.z = GEOM.dropZMax;
      d.v.z = -Math.abs(d.v.z) * 0.25;
    }
    if (d.p.y <= rest) {
      d.p.y = rest;
      if (Math.abs(d.v.y) > 0.9 && d.bounces < 3) {
        d.v.y = -d.v.y * 0.42;
        d.v.x *= 0.6;
        d.v.z *= 0.55;
        d.bounces++;
        const hit = Math.min(1, Math.abs(d.v.y) / 3);
        d.scale.y = 1 - 0.3 * hit;
        d.scale.x = d.scale.z = 1 + 0.2 * hit;
      } else {
        d.v.x = d.v.y = d.v.z = 0;
        d.settled = true;
      }
    }
    // paredes laterales de la ventana
    const half = 0.26 - GEOM.dropR;
    if (d.p.x > GEOM.spawn.x + half) { d.p.x = GEOM.spawn.x + half; d.v.x = -Math.abs(d.v.x) * 0.5; }
    if (d.p.x < GEOM.spawn.x - half) { d.p.x = GEOM.spawn.x - half; d.v.x = Math.abs(d.v.x) * 0.5; }
  }

  private spawnParticles() {
    const d = this.capsule;
    this.particles = [];
    const n = d.rarity === "legendaria" ? 36 : d.rarity === "epica" ? 28 : 20;
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const up = 2 + this.rng() * 3;
      const side = 0.6 + this.rng() * 1.6;
      this.particles.push({
        p: { x: d.p.x, y: d.p.y + 0.1, z: d.p.z },
        v: { x: Math.cos(a) * side, y: up, z: Math.sin(a) * side },
        life: 1,
        size: 0.02 + this.rng() * 0.035,
      });
    }
  }
}
