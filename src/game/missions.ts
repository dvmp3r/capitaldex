import type { AchievementContext, Reward } from "./achievements";
import type { Rarity } from "./types";

/**
 * Objetivos de partida: tres metas cortas siempre visibles que se renuevan al cumplirse.
 * Cada una mide un incremento desde que se asignó (`baseline`) o un valor absoluto, y paga
 * capital o carteras gratis. Son la fuente de pequeñas recompensas entre cartera y cartera.
 */
export type MissionKind = "pulls" | "rarity" | "sector" | "upgrades" | "news" | "earn" | "shares" | "orders" | "companies";

export interface Mission {
  id: string;
  kind: MissionKind;
  title: string;
  /** Meta a alcanzar (incremento sobre baseline, o valor absoluto en `shares`). */
  target: number;
  baseline: number;
  reward: Reward;
  /** Sector o rareza según el tipo. */
  param?: string;
}

export const MISSION_COUNT = 3;

const SECTORS = ["Tecnología", "Finanzas", "Salud", "Consumo cíclico", "Consumo básico", "Comunicación", "Industria", "Energía", "Materiales", "Inmobiliario", "Servicios públicos"];
const RARITY_LABEL: Record<Rarity, string> = { comun: "común", poco_comun: "poco común", rara: "rara", epica: "épica", legendaria: "legendaria" };
const SHARE_STEPS = [10, 25, 50, 100];

const pick = <T,>(rng: () => number, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length) % xs.length];

/** Valor actual de la métrica de un objetivo. */
export function missionMetric(m: Mission, ctx: AchievementContext): number {
  switch (m.kind) {
    case "pulls": return ctx.pulls;
    case "rarity": return ctx.byRarity[m.param as Rarity] ?? 0;
    case "sector": return ctx.bySector[m.param ?? ""] ?? 0;
    case "upgrades": return ctx.upgradeLevels;
    case "news": return ctx.newsTaken;
    case "earn": return ctx.totalEarned;
    case "shares": return ctx.maxShares;
    case "orders": return ctx.clicks;
    case "companies": return ctx.companies;
  }
}

/** Progreso 0..1. */
export function missionProgress(m: Mission, ctx: AchievementContext): number {
  const v = missionMetric(m, ctx) - m.baseline;
  return Math.max(0, Math.min(1, v / m.target));
}

export function missionDone(m: Mission, ctx: AchievementContext): boolean {
  return missionMetric(m, ctx) - m.baseline >= m.target;
}

/** Texto "x / meta" para la interfaz (en `earn` se formatea fuera). */
export function missionCurrent(m: Mission, ctx: AchievementContext): number {
  return Math.max(0, Math.min(m.target, missionMetric(m, ctx) - m.baseline));
}

/**
 * Crea un objetivo nuevo adecuado al momento de la partida, evitando repetir tipo con los activos.
 * `income` son los ingresos por segundo actuales (para dimensionar "genera X").
 */
export function newMission(ctx: AchievementContext, income: number, rng: () => number, used: Iterable<MissionKind>, seq: number): Mission {
  const taken = new Set(used);
  const early = ctx.pulls < 40;
  const kinds: MissionKind[] = ["pulls", "sector", "upgrades", "news", "earn", "orders", "companies", "rarity", "shares"];
  // Rarezas y acciones solo cuando tienen sentido.
  const candidates = kinds.filter((k) => !taken.has(k)).filter((k) => (k === "rarity" ? ctx.pulls >= 10 : k === "shares" ? ctx.maxShares >= 3 : true));
  const kind = pick<MissionKind>(rng, candidates.length ? candidates : ["pulls"]);
  const id = `m${seq}-${kind}`;
  switch (kind) {
    case "pulls": {
      const target = early ? pick(rng, [4, 6, 8]) : pick(rng, [8, 12, 16]);
      return { id, kind, title: `Abre ${target} carteras`, target, baseline: ctx.pulls, reward: { kind: "capital", minutes: early ? 2 : 3 } };
    }
    case "rarity": {
      const rarity: Rarity = ctx.pulls < 80 ? "rara" : pick(rng, ["rara", "rara", "epica"]);
      const art = rarity === "epica" ? "una empresa épica" : "una empresa rara";
      return { id, kind, title: `Consigue ${art}`, target: 1, baseline: ctx.byRarity[rarity] ?? 0, param: rarity, reward: rarity === "epica" ? { kind: "freePulls", n: 2 } : { kind: "capital", minutes: 4 } };
    }
    case "sector": {
      const sector = pick(rng, SECTORS);
      const target = early ? 2 : 3;
      return { id, kind, title: `Consigue ${target} empresas de ${sector}`, target, baseline: ctx.bySector[sector] ?? 0, param: sector, reward: { kind: "capital", minutes: 3 } };
    }
    case "upgrades": {
      const target = early ? 2 : pick(rng, [3, 4, 6]);
      return { id, kind, title: `Sube ${target} niveles de titulares`, target, baseline: ctx.upgradeLevels, reward: { kind: "freePulls", n: 1 } };
    }
    case "news": {
      const target = pick(rng, [2, 3]);
      return { id, kind, title: `Aprovecha ${target} noticias de última hora`, target, baseline: ctx.newsTaken, reward: { kind: "capital", minutes: 5 } };
    }
    case "earn": {
      const minutes = early ? 6 : 10;
      const target = Math.max(500, Math.round(income * minutes * 60));
      return { id, kind, title: `Genera capital (${minutes} min de ingresos)`, target, baseline: ctx.totalEarned, reward: { kind: "freePulls", n: 1 } };
    }
    case "shares": {
      const next = SHARE_STEPS.find((s) => s > ctx.maxShares) ?? ctx.maxShares + 50;
      return { id, kind, title: `Llega a ${next} acciones de una misma empresa`, target: next, baseline: 0, reward: { kind: "capital", minutes: 5 } };
    }
    case "orders": {
      const target = pick(rng, [10, 15, 20]);
      return { id, kind, title: `Usa ${target} órdenes de Operar`, target, baseline: ctx.clicks, reward: { kind: "capital", minutes: 2 } };
    }
    case "companies": {
      const target = early ? pick(rng, [3, 5]) : pick(rng, [5, 8, 10]);
      return { id, kind, title: `Descubre ${target} empresas nuevas`, target, baseline: ctx.companies, reward: { kind: "capital", minutes: early ? 2 : 4 } };
    }
  }
}

/** Comprueba que un objeto cargado del guardado tiene la forma de un objetivo. */
export function isMission(x: unknown): x is Mission {
  if (!x || typeof x !== "object") return false;
  const m = x as Record<string, unknown>;
  return typeof m.id === "string" && typeof m.kind === "string" && typeof m.title === "string" && typeof m.target === "number" && typeof m.baseline === "number" && !!m.reward;
}

/** Texto del tipo de recompensa, para la interfaz. */
export const RARITY_WORD = RARITY_LABEL;
