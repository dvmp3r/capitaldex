import { FREE_PULLS, GACHA_ODDS, ODDS_MIN_COMMON, PULL_BASE_COST, PULL_INCOME_PER_PULL, PULL_LATE_SLOWDOWN, PULL_TIME_MAX_SEC, PULL_TIME_MIN_SEC, PULL_TIME_RAMP } from "./balance";
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

/**
 * Probabilidades efectivas: `luck` multiplica épica y legendaria (mejoras de suerte, agitar la máquina)
 * y lo que suben se le quita a común, que nunca baja de ODDS_MIN_COMMON.
 */
export function effectiveOdds(luck = 1): Record<Rarity, number> {
  if (luck <= 1) return GACHA_ODDS;
  const epica = GACHA_ODDS.epica * luck;
  const legendaria = GACHA_ODDS.legendaria * luck;
  const others = GACHA_ODDS.poco_comun + GACHA_ODDS.rara + epica + legendaria;
  const comun = 1 - others;
  if (comun >= ODDS_MIN_COMMON) return { comun, poco_comun: GACHA_ODDS.poco_comun, rara: GACHA_ODDS.rara, epica, legendaria };
  // Tope: se reparte lo que queda manteniendo la proporción épica/legendaria.
  const room = 1 - ODDS_MIN_COMMON - GACHA_ODDS.poco_comun - GACHA_ODDS.rara;
  const k = room / (epica + legendaria);
  return { comun: ODDS_MIN_COMMON, poco_comun: GACHA_ODDS.poco_comun, rara: GACHA_ODDS.rara, epica: epica * k, legendaria: legendaria * k };
}

/** Sortea una rareza según las probabilidades. rng debe devolver [0, 1). */
export function weightedRarity(rng: () => number, odds: Record<Rarity, number> = GACHA_ODDS): Rarity {
  let r = rng();
  for (const rarity of RARITIES) {
    r -= odds[rarity];
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
export function rollPull(pool: Record<Rarity, Company[]>, state: GachaState, rng: () => number = Math.random, odds: Record<Rarity, number> = GACHA_ODDS) {
  const rolled = weightedRarity(rng, odds);
  const picked = pickCompany(pool, rolled, rng);
  return { ...picked, pity: false, next: nextGachaState(state, picked.rarity) };
}
