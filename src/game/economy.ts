import { CLICK_MIN, CLICK_SECONDS, INCOME_COEF, INCOME_EXP, INDEX_SETS, OFFLINE_CAP_SECONDS, OFFLINE_RATE, SHARE_MILESTONES } from "./balance";
import { rarityOf } from "./rarity";
import { regionOf } from "./regions";
import type { Company, Holdings, SetProgress } from "./types";
import { baseMultipliers, type Multipliers } from "./upgrades";

/** Ingresos por segundo de una sola acción de la empresa. */
export function baseIncome(c: Company): number {
  return INCOME_COEF * Math.pow(c.marketCapUsd / 1e9, INCOME_EXP);
}

/** Multiplicador acumulado por hitos de acciones. */
export function milestoneMult(shares: number): number {
  return SHARE_MILESTONES.reduce((m, s) => (shares >= s.shares ? m * s.mult : m), 1);
}

export function nextMilestone(shares: number): { shares: number; mult: number } | null {
  return SHARE_MILESTONES.find((s) => shares < s.shares) ?? null;
}

/** Multiplicador de titulares y noticias que afecta a esta empresa (sector × región × rareza × global). */
export function companyMultiplier(c: Company, m: Multipliers): number {
  return m.global * (m.sector[c.sector] ?? 1) * m.region[regionOf(c.countryCode)] * m.rarity[rarityOf(c)];
}

export function companyIncome(c: Company, shares: number, mults: Multipliers = baseMultipliers()): number {
  if (shares <= 0) return 0;
  return baseIncome(c) * shares * milestoneMult(shares) * companyMultiplier(c, mults);
}

/** Progreso de cada set de índice. indexMembers: id del set → tickers que lo forman. */
export function setProgress(holdings: Holdings, indexMembers: Record<string, string[]>): SetProgress[] {
  return INDEX_SETS.map((set) => {
    const members = indexMembers[set.id] ?? [];
    const owned = members.filter((t) => (holdings[t]?.shares ?? 0) > 0).length;
    const total = members.length;
    const frac = total > 0 ? owned / total : 0;
    return { ...set, owned, total, mult: 1 + set.bonus * frac * frac };
  });
}

export function setsMultiplier(sets: SetProgress[]): number {
  return sets.reduce((m, s) => m * s.mult, 1);
}

export interface IncomeBreakdown {
  perCompany: number; // suma de ingresos de las empresas (con titulares)
  setsMult: number;
  total: number;
}

export function totalIncome(holdings: Holdings, byId: Map<string, Company>, indexMembers: Record<string, string[]>, mults: Multipliers = baseMultipliers()): IncomeBreakdown {
  let perCompany = 0;
  for (const [id, h] of Object.entries(holdings)) {
    const c = byId.get(id);
    if (c) perCompany += companyIncome(c, h.shares, mults);
  }
  const setsMult = setsMultiplier(setProgress(holdings, indexMembers));
  return { perCompany, setsMult, total: perCompany * setsMult };
}

export function clickValue(incomePerSecond: number, seconds: number = CLICK_SECONDS): number {
  return Math.max(CLICK_MIN, incomePerSecond * seconds);
}

/** Capital ganado durante una ausencia de `seconds` segundos. */
export function offlineEarnings(incomePerSecond: number, seconds: number, rate: number = OFFLINE_RATE, capSeconds: number = OFFLINE_CAP_SECONDS): { seconds: number; earned: number } {
  const s = Math.min(Math.max(0, seconds), capSeconds);
  return { seconds: s, earned: incomePerSecond * s * rate };
}
