/**
 * Todas las constantes de equilibrio del juego.
 * Los umbrales y la fórmula de ingresos se replican en data/empresas.xlsx (hoja Umbrales)
 * y en scripts/build_data.py. Si cambias algo aquí, cámbialo allí.
 */
import type { Rarity } from "./types";

export const SAVE_VERSION = 4; // 4: logros, noticias aprovechadas y gestor automático
export const TICK_MS = 250;

/** Capitalización mínima en USD para cada rareza (común = resto). */
export const RARITY_THRESHOLDS_USD: Record<Exclude<Rarity, "comun">, number> = {
  legendaria: 1e12,
  epica: 2.5e11,
  rara: 8e10,
  poco_comun: 2.5e10,
};

/** Probabilidad de cada rareza en una cartera. Deben sumar 1. */
export const GACHA_ODDS: Record<Rarity, number> = {
  comun: 0.62,
  poco_comun: 0.255,
  rara: 0.1,
  epica: 0.022,
  legendaria: 0.003, // ~1 cada 333 carteras: sin piedad, la legendaria tiene que costar
};


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
  { id: "CAC40", name: "CAC 40", bonus: 0.25 },
  { id: "FTSEMIB", name: "FTSE MIB", bonus: 0.25 },
  { id: "AEX", name: "AEX 25", bonus: 0.2 },
  { id: "SMI", name: "SMI 20", bonus: 0.2 },
  { id: "OMXS30", name: "OMX Estocolmo 30", bonus: 0.2 },
  { id: "EUROSTOXX50", name: "Euro Stoxx 50", bonus: 0.3 },
  { id: "FTSE100", name: "FTSE 100", bonus: 0.4 },
  { id: "NASDAQ100", name: "Nasdaq-100", bonus: 0.4 },
  { id: "SP500", name: "S&P 500", bonus: 1.0 },
  { id: "TSX60", name: "TSX 60", bonus: 0.3 },
  { id: "IPC", name: "IPC México", bonus: 0.25 },
  { id: "HANGSENG", name: "Hang Seng", bonus: 0.4 },
  { id: "NIFTY50", name: "Nifty 50", bonus: 0.3 },
  { id: "ASX50", name: "ASX 50", bonus: 0.3 },
  { id: "ASIA_TOP", name: "Asia y Oriente Medio", bonus: 0.2 },
];
