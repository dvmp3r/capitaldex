/**
 * Todas las constantes de equilibrio del juego.
 * Los umbrales y la fórmula de ingresos se replican en data/empresas.xlsx (hoja Umbrales)
 * y en scripts/build_data.py. Si cambias algo aquí, cámbialo allí.
 */
import type { Rarity } from "./types";

export const SAVE_VERSION = 1;
export const TICK_MS = 250;

/** Capitalización mínima en USD para cada rareza (común = resto). */
export const RARITY_THRESHOLDS_USD: Record<Exclude<Rarity, "comun">, number> = {
  legendaria: 1.2e12,
  epica: 3.5e11,
  rara: 1.5e11,
  poco_comun: 5.5e10,
};

/** Probabilidad de cada rareza en una cartera. Deben sumar 1. */
export const GACHA_ODDS: Record<Rarity, number> = {
  comun: 0.55,
  poco_comun: 0.27,
  rara: 0.12,
  epica: 0.05,
  legendaria: 0.01,
};

/** Piedad: tras N-1 tiradas sin épica (o legendaria), la N garantiza esa rareza o superior. */
export const PITY_EPIC = 20;
export const PITY_LEGENDARY = 90;

export const FREE_PULLS = 3;
export const PULL_BASE_COST = 100;
export const PULL_COST_GROWTH = 1.08;

/** ingresos/s de una acción = INCOME_COEF × (cap. USD en miles de millones) ^ INCOME_EXP */
export const INCOME_COEF = 0.05;
export const INCOME_EXP = 0.75;

/** Hitos de acciones: multiplicadores acumulativos. */
export const SHARE_MILESTONES: { shares: number; mult: number }[] = [
  { shares: 10, mult: 2 },
  { shares: 25, mult: 2 },
  { shares: 50, mult: 2 },
  { shares: 100, mult: 3 },
];

/** Botón Operar: equivale a N segundos de ingresos pasivos, con un mínimo. */
export const CLICK_SECONDS = 5;
export const CLICK_MIN = 1;

export const OFFLINE_RATE = 0.5;
export const OFFLINE_CAP_SECONDS = 8 * 3600;
export const OFFLINE_MIN_SECONDS = 60;

/** Sets por índice. El total de cada set se calcula a partir de los datos. */
export const INDEX_SETS: { id: string; name: string; bonus: number }[] = [
  { id: "DOW30", name: "Dow Jones 30", bonus: 0.25 },
  { id: "IBEX35", name: "IBEX 35", bonus: 0.25 },
  { id: "DAX40", name: "DAX 40", bonus: 0.25 },
  { id: "EUROSTOXX50", name: "Euro Stoxx 50", bonus: 0.3 },
  { id: "NASDAQ100", name: "Nasdaq-100", bonus: 0.4 },
  { id: "UK_TOP", name: "Reino Unido Top 20", bonus: 0.15 },
  { id: "ASIA_TOP", name: "Asia y Oriente Medio", bonus: 0.2 },
];
