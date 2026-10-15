import { FREE_PULLS, GACHA_ODDS, PULL_BASE_COST, PULL_INCOME_PER_PULL, PULL_LATE_SLOWDOWN, PULL_TIME_MAX_SEC, PULL_TIME_MIN_SEC, PULL_TIME_RAMP } from "./balance";
import { RARITY_RANK } from "./rarity";
import { RARITIES, type Company, type GachaState, type Rarity } from "./types";

export const INITIAL_GACHA: GachaState = { pulls: 0, sinceEpic: 0, sinceLegendary: 0 };

/** Coste de la siguiente cartera; `costMult` aplica los descuentos del bróker (1 = sin descuento). */
export function pullCost(pulls: number, costMult = 1): number {
  if (pulls < FREE_PULLS) return 0;
  const k = pulls - FREE_PULLS;
  const targetSeconds = PULL_TIME_MIN_SEC + (PULL_TIME_MAX_SEC - PULL_TIME_MIN_SEC) * (1 - Math.exp(-k / PULL_TIME_RAMP));
  const expectedIncome = PULL_INCOME_PER_PULL * k;
  const cost = Math.max(PULL_BASE_COST, expectedIncome * targetSeconds * (1 + k / PULL_LATE_SLOWDOWN));
  return Math.round(cost * costMult);
}

/** Sortea una rareza según las probabilidades. rng debe devolver [0, 1). */
export function weightedRarity(rng: () => number): Rarity {
  let r = rng();
  for (const rarity of RARITIES) {
    r -= GACHA_ODDS[rarity];
    if (r < 0) return rarity;
  }
  return "comun";
}

/** Elige una empresa de la rareza indicada; si el grupo está vacío baja a la siguiente rareza con empresas. */
export function pickCompany(pool: Record<Rarity, Company[]>, rarity: Rarity, rng: () => number): { company: Company; rarity: Rarity } {
  let idx = RARITY_RANK[rarity];
  while (idx >= 0) {
    const r = RARITIES[idx];
    const group = pool[r];
    if (group.length > 0) {
      return { company: group[Math.floor(rng() * group.length)], rarity: r };
    }
    idx--;
  }
  throw new Error("No hay empresas en ningún grupo de rareza");
}

export function nextGachaState(state: GachaState, rarity: Rarity): GachaState {
  const rank = RARITY_RANK[rarity];
  return {
    pulls: state.pulls + 1,
    sinceEpic: rank >= RARITY_RANK.epica ? 0 : state.sinceEpic + 1,
    sinceLegendary: rank >= RARITY_RANK.legendaria ? 0 : state.sinceLegendary + 1,
  };
}

/** Tirada completa: sorteo y elección de empresa. Sin piedad: probabilidad pura. No muta nada. */
export function rollPull(pool: Record<Rarity, Company[]>, state: GachaState, rng: () => number = Math.random) {
  const rolled = weightedRarity(rng);
  const picked = pickCompany(pool, rolled, rng);
  return { ...picked, pity: false, next: nextGachaState(state, picked.rarity) };
}
