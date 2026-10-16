import { mulberry32 } from "../../game/hash";
import type { Rarity } from "../../game/types";

/**
 * Simulación de la máquina de cápsulas, sin dependencias de three.js.
 * Unidades: 1 = ~10 cm. El origen está en el suelo, bajo el centro de la máquina.
 * La escena 3D lee este estado en cada fotograma; las fases (turn/drop/open) devuelven promesas.
 *
 * Las cápsulas de la vitrina usan dinámica basada en posiciones (PBD) con paso fijo: se predice la
 * posición, se proyectan las restricciones (no solaparse, no salir de la caja) varias veces y la
 * velocidad se deduce del desplazamiento. Así la pila se asienta sin vibrar y nada se atraviesa.
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
  /** Dormida: en reposo sobre algo, no se integra hasta que la toquen. */
  asleep: boolean;
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

/**
 * Vitrina cilíndrica donde viven las cápsulas: radio y alturas. `min`/`max` es su caja envolvente
 * (la usan las pruebas) y `dome` su esfera envolvente, para la ilustración 2D de respaldo.
 */
const CHAMBER_R = 0.66;
const CHAMBER = { radius: CHAMBER_R, min: { x: -CHAMBER_R, y: 1.92, z: -CHAMBER_R }, max: { x: CHAMBER_R, y: 3.07, z: CHAMBER_R } };
export const GEOM = {
  chamber: CHAMBER,
  dome: {
    c: { x: 0, y: (CHAMBER.min.y + CHAMBER.max.y) / 2, z: 0 },
    r: Math.hypot(CHAMBER.max.x, (CHAMBER.max.y - CHAMBER.min.y) / 2, CHAMBER.max.z),
  },
  capR: 0.14,
  dropR: 0.17,
  /** La cápsula aparece dentro de la boca de salida, rueda hacia delante y cae a la bandeja. */
  spawn: { x: 0, y: 0.8, z: 0.38 },
  dropVel: { x: 0, y: -0.2, z: 1.5 },
  dropZMax: 0.92,
  trayY: 0.22,
  crankDuration: 0.75,
  stirDuration: 0.85,
};

const GRAVITY = 9;
const CAP_COUNT = 36;
/** Paso fijo de la física de la vitrina y pasadas de proyección por paso. */
const H = 1 / 120;
const ITERATIONS = 4;
const MAX_SPEED = 4.5;
const SLEEP_SPEED = 0.04;
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
  /** Segundos que quedan de agitación (la manivela da dos sacudidas) */
  stir = 0;
  capsule: DropState = { active: false, rarity: "comun", p: v3(), v: v3(), scale: v3(1, 1, 1), bounces: 0, settled: false, lid: 0, glow: 0 };
  particles: Particle[] = [];
  /** Anillo de apertura: progreso 0..1, o -1 si no hay. */
  ring = -1;
  time = 0;
  /** Alguna cápsula de la vitrina se está moviendo */
  moving = false;
  private rng = mulberry32(7);
  private timers: { at: number; resolve: () => void }[] = [];
  private acc = 0;
  private kicks: number[] = [];
  /** Campo de aceleración transitorio (al mover la máquina): empuja de lado, apenas hacia arriba. */
  private field = { ax: 0, ay: 0, az: 0, until: 0 };
  private prev: Vec3[] = [];
  /** La cápsula abierta se está encogiendo hasta desaparecer (al guardar la carta). */
  private vanishing = false;
  private glowPhase: { start: number; dur: number } | null = null;
  private lidPhase: { start: number; dur: number } | null = null;

  constructor() {
    this.seedCapsules();
    // Dejar que las cápsulas se asienten antes de que se vea la máquina.
    for (let i = 0; i < 240; i++) this.step(1 / 60);
  }

  private seedCapsules() {
    const { min } = GEOM.chamber;
    const r = GEOM.capR;
    this.caps = [];
    // Caen desordenadas desde distintas alturas y se asientan solas: pila natural, no una rejilla.
    for (let i = 0; i < CAP_COUNT; i++) {
      const a = this.rng() * Math.PI * 2;
      const d = Math.sqrt(this.rng()) * (GEOM.chamber.radius - r - 0.01);
      this.caps.push({
        p: v3(Math.cos(a) * d, min.y + r + 0.05 + i * 0.05 + this.rng() * 0.04, Math.sin(a) * d),
        v: v3(),
        rot: v3(this.rng() * 6, this.rng() * 6, this.rng() * 6),
        rarity: DOME_MIX[i % DOME_MIX.length],
        asleep: false,
      });
    }
    this.prev = this.caps.map((c) => ({ ...c.p }));
  }

  /** ¿Hay algo moviéndose o alguna fase pendiente? (la escena no dibuja cuando no) */
  busy(): boolean {
    return this.moving || this.vanishing || this.ring >= 0 || this.stir > 0 || this.crank.t < 1 || (this.capsule.active && !this.capsule.settled) || this.particles.length > 0 || this.capsule.glow > 0.01 || this.timers.length > 0;
  }

  /**
   * Mover la máquina: las cápsulas sienten una aceleración contraria durante un instante (como al
   * inclinar una pecera). Suave: nunca supera la gravedad, así que resbalan y se revuelven, no vuelan.
   */
  shake(ax: number, ay: number, az: number) {
    const lim = (v: number, m: number) => Math.max(-m, Math.min(m, v));
    this.field = { ax: lim(ax, 7), ay: lim(ay, 1.5), az: lim(az, 7), until: this.time + 0.12 };
    for (const b of this.caps) b.asleep = false;
    this.moving = true;
  }

  /** Impulso directo a todas las cápsulas (con algo de azar). */
  nudge(ax: number, ay: number, az: number) {
    for (const b of this.caps) {
      b.asleep = false;
      b.v.x += ax * (0.6 + this.rng() * 0.8);
      b.v.y += ay * (0.6 + this.rng() * 0.8);
      b.v.z += az * (0.6 + this.rng() * 0.8);
      clampSpeed(b.v);
    }
    this.moving = true;
  }

  /** Golpe seco desde abajo (el plato agitador de la máquina): las de abajo saltan más. */
  private kick(strength: number) {
    const { min, max } = GEOM.chamber;
    for (const b of this.caps) {
      const h = (b.p.y - min.y) / (max.y - min.y); // 0 abajo → 1 arriba
      const up = strength * (1.2 - h) * (0.7 + this.rng() * 0.6);
      b.asleep = false;
      b.v.y += up;
      b.v.x += (this.rng() - 0.5) * strength * 0.5;
      b.v.z += (this.rng() - 0.5) * strength * 0.5;
      clampSpeed(b.v);
    }
    this.moving = true;
  }

  /** Promesa que se resuelve cuando el reloj de la simulación llegue a `seconds` desde ahora. */
  private after(seconds: number) {
    return new Promise<void>((resolve) => this.timers.push({ at: this.time + seconds, resolve }));
  }

  turn(): Promise<void> {
    this.crank = { angle: this.crank.angle, from: this.crank.angle, to: this.crank.angle + Math.PI * 2, t: 0 };
    this.stir = GEOM.stirDuration;
    this.kicks = [this.time + 0.05, this.time + 0.4];
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

  /** Recoger la cápsula abierta: se encoge y desaparece de la bandeja. */
  collect() {
    if (this.capsule.active) this.vanishing = true;
  }

  reset() {
    this.vanishing = false;
    this.ring = -1;
    this.timers = [];
    this.glowPhase = null;
    this.lidPhase = null;
    this.particles = [];
    this.capsule = { ...this.capsule, active: false, settled: false, bounces: 0, lid: 0, glow: 0, scale: v3(1, 1, 1) };
  }

  skip(rarity: Rarity) {
    this.vanishing = false;
    this.ring = -1;
    this.timers = [];
    this.glowPhase = null;
    this.lidPhase = null;
    this.stir = 0;
    this.kicks = [];
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
    dt = Math.min(dt, 0.1);
    this.time += dt;

    // Manivela
    if (this.crank.t < 1) {
      this.crank.t = Math.min(1, this.crank.t + dt / GEOM.crankDuration);
      const k = ease(this.crank.t);
      const overshoot = Math.sin(this.crank.t * Math.PI) * 0.18; // pequeño rebote
      this.crank.angle = this.crank.from + (this.crank.to - this.crank.from) * k + overshoot;
    }
    if (this.stir > 0) this.stir -= dt;
    while (this.kicks.length && this.kicks[0] <= this.time) {
      this.kicks.shift();
      this.kick(1.7);
    }

    // Cápsulas de la vitrina: paso fijo (varios subpasos por fotograma, con tope)
    this.acc = Math.min(this.acc + dt, H * 12);
    while (this.acc >= H) {
      this.stepCapsules(H);
      this.acc -= H;
    }

    // Cápsula que cae
    if (this.capsule.active && !this.capsule.settled) this.stepDrop(dt);
    if (this.capsule.active && this.vanishing) {
      const sc = this.capsule.scale;
      const k = Math.max(0, 1 - dt * 7);
      sc.x *= k;
      sc.y *= k;
      sc.z *= k;
      this.capsule.p.y += dt * 0.5;
      this.capsule.glow = 0;
      if (sc.x < 0.03) {
        this.vanishing = false;
        this.capsule = { ...this.capsule, active: false, settled: false, bounces: 0, lid: 0, scale: v3(1, 1, 1) };
      }
    } else if (this.capsule.active) {
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

    // Anillo de apertura
    if (this.ring >= 0) {
      this.ring += dt / 0.7;
      if (this.ring >= 1) this.ring = -1;
    }
    // Partículas
    for (const pt of this.particles) {
      pt.v.y -= 4.5 * dt;
      pt.v.x *= 1 - 1.2 * dt;
      pt.v.z *= 1 - 1.2 * dt;
      pt.p.x += pt.v.x * dt;
      pt.p.y += pt.v.y * dt;
      pt.p.z += pt.v.z * dt;
      pt.life -= dt / 1.15;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);

    // Temporizadores
    const due = this.timers.filter((t) => t.at <= this.time);
    this.timers = this.timers.filter((t) => t.at > this.time);
    due.forEach((t) => t.resolve());
  }

  /** Un paso fijo de la física de la vitrina (PBD). */
  private stepCapsules(h: number) {
    const caps = this.caps;
    const n = caps.length;
    const { min, max } = GEOM.chamber;
    const r = GEOM.capR;
    const minD = 2 * r;
    const prev = this.prev;
    const contact = new Uint8Array(n);

    // 1) Predicción: gravedad e integración (las dormidas no se mueven)
    for (let i = 0; i < n; i++) {
      const b = caps[i];
      prev[i].x = b.p.x;
      prev[i].y = b.p.y;
      prev[i].z = b.p.z;
      if (b.asleep) continue;
      b.v.y -= GRAVITY * h;
      if (this.time < this.field.until) {
        b.v.x += this.field.ax * h * (0.8 + (i % 5) * 0.1);
        b.v.y += this.field.ay * h;
        b.v.z += this.field.az * h * (0.8 + (i % 3) * 0.1);
      }
      // leve rozamiento con el aire
      b.v.x *= 0.998;
      b.v.z *= 0.998;
      b.p.x += b.v.x * h;
      b.p.y += b.v.y * h;
      b.p.z += b.v.z * h;
    }

    // 2) Proyección de restricciones, varias pasadas
    for (let it = 0; it < ITERATIONS; it++) {
      for (let i = 0; i < n; i++) {
        const a = caps[i];
        for (let j = i + 1; j < n; j++) {
          const b = caps[j];
          if (a.asleep && b.asleep) continue;
          const dx = b.p.x - a.p.x;
          const dy = b.p.y - a.p.y;
          const dz = b.p.z - a.p.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 >= minD * minD || d2 === 0) continue;
          const d = Math.sqrt(d2);
          const push = (minD - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          const uz = dz / d;
          // Si una está dormida, la otra se lleva toda la corrección (y despierta a la dormida si empuja fuerte)
          let wa = 0.5;
          let wb = 0.5;
          if (a.asleep) { wa = 0; wb = 1; if (push > 0.004) a.asleep = false; }
          if (b.asleep) { wb = 0; wa = 1; if (push > 0.004) b.asleep = false; }
          a.p.x -= ux * push * 2 * wa;
          a.p.y -= uy * push * 2 * wa;
          a.p.z -= uz * push * 2 * wa;
          b.p.x += ux * push * 2 * wb;
          b.p.y += uy * push * 2 * wb;
          b.p.z += uz * push * 2 * wb;
          contact[i] = 1;
          contact[j] = 1;
        }
      }
      const limit = GEOM.chamber.radius - r;
      for (let i = 0; i < n; i++) {
        const b = caps[i];
        const d = Math.hypot(b.p.x, b.p.z);
        if (d > limit) { b.p.x *= limit / d; b.p.z *= limit / d; contact[i] = 1; }
        if (b.p.y < min.y + r) { b.p.y = min.y + r; contact[i] = 1; }
        else if (b.p.y > max.y - r) { b.p.y = max.y - r; contact[i] = 1; }
      }
    }

    // 3) Apoyo: suelo o una cápsula debajo. Solo así se puede dormir; sin apoyo, se despierta.
    const supported = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (caps[i].p.y <= min.y + r + 0.006) supported[i] = 1;
    const near = minD + 0.02;
    for (let i = 0; i < n; i++) {
      const a = caps[i];
      for (let j = i + 1; j < n; j++) {
        const b = caps[j];
        const dx = b.p.x - a.p.x;
        const dz = b.p.z - a.p.z;
        const dy = b.p.y - a.p.y;
        if (Math.abs(dy) > near || dx * dx + dz * dz + dy * dy > near * near) continue;
        if (dy > 0.45 * minD) supported[j] = 1; // b está encima de a
        else if (dy < -0.45 * minD) supported[i] = 1; // a está encima de b
      }
    }

    // 4) Velocidad a partir del desplazamiento; fricción en contacto; sueño
    let moving = false;
    for (let i = 0; i < n; i++) {
      const b = caps[i];
      if (b.asleep) {
        if (!supported[i]) b.asleep = false; // perdió el apoyo: vuelve a caer
        continue;
      }
      b.v.x = (b.p.x - prev[i].x) / h;
      b.v.y = (b.p.y - prev[i].y) / h;
      b.v.z = (b.p.z - prev[i].z) / h;
      if (contact[i]) {
        b.v.x *= 0.9;
        b.v.z *= 0.9;
        b.v.y *= 0.96;
      }
      clampSpeed(b.v);
      const sp = Math.hypot(b.v.x, b.v.y, b.v.z);
      if (supported[i] && sp < SLEEP_SPEED) {
        b.v.x = b.v.y = b.v.z = 0;
        b.asleep = true;
      } else {
        moving = true;
        // rodar: giro proporcional a la velocidad
        b.rot.x += (b.v.z / r) * h;
        b.rot.z -= (b.v.x / r) * h;
      }
    }
    this.moving = moving;
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
    // paredes laterales de la boca
    const half = 0.26 - GEOM.dropR;
    if (d.p.x > GEOM.spawn.x + half) { d.p.x = GEOM.spawn.x + half; d.v.x = -Math.abs(d.v.x) * 0.5; }
    if (d.p.x < GEOM.spawn.x - half) { d.p.x = GEOM.spawn.x - half; d.v.x = Math.abs(d.v.x) * 0.5; }
  }

  private spawnParticles() {
    const d = this.capsule;
    this.particles = [];
    this.ring = 0;
    const n = d.rarity === "legendaria" ? 60 : d.rarity === "epica" ? 48 : d.rarity === "rara" ? 38 : 30;
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const fountain = i % 3 !== 0; // dos tercios suben como un surtidor, el resto sale en abanico bajo
      const up = fountain ? 2.2 + this.rng() * 3 : 0.6 + this.rng() * 1.2;
      const side = fountain ? 0.3 + this.rng() * 1.1 : 1.4 + this.rng() * 1.6;
      this.particles.push({
        p: { x: d.p.x + (this.rng() - 0.5) * 0.08, y: d.p.y + 0.12, z: d.p.z + (this.rng() - 0.5) * 0.08 },
        v: { x: Math.cos(a) * side, y: up, z: Math.sin(a) * side },
        life: 0.8 + this.rng() * 0.4,
        size: 0.022 + this.rng() * 0.045,
      });
    }
  }
}

function clampSpeed(v: Vec3) {
  const sp = Math.hypot(v.x, v.y, v.z);
  if (sp > MAX_SPEED) {
    v.x *= MAX_SPEED / sp;
    v.y *= MAX_SPEED / sp;
    v.z *= MAX_SPEED / sp;
  }
}
