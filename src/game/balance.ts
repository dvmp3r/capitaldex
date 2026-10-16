/**
 * Todas las constantes de equilibrio del juego.
 * Los umbrales y la fórmula de ingresos se replican en data/empresas.xlsx (hoja Umbrales)
 * y en scripts/build_data.py. Si cambias algo aquí, cámbialo allí.
 */
import type { Rarity } from "./types";

export const SAVE_VERSION = 5; // 5: prestigio (holding, influencia) y colección descubierta
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


/** Agitar la máquina (arrastrarla con ganas) justo antes de abrir: épica y legendaria × este factor, una vez. */
export const SHAKE_ODDS_BONUS = 1.25;
export const SHAKE_WINDOW_MS = 12_000;
/** Por debajo de esta probabilidad de común no se puede bajar con mejoras de suerte. */
export const ODDS_MIN_COMMON = 0.2;
export const FREE_PULLS = 3;
export const PULL_BASE_COST = 100;
/**
 * Curva de coste de la cartera. Antes era 100 × 1,08^n (exponencial) y, como los ingresos crecen
 * casi lineales con las empresas, a la tirada 130 una cartera costaba horas de ingresos.
 * Ahora el coste sigue a los ingresos esperados (≈ PULL_INCOME_PER_PULL por cartera abierta) multiplicados
 * por un "tiempo objetivo" que sube de PULL_TIME_MIN_SEC a PULL_TIME_MAX_SEC, con un frenado suave tardío.
 */
export const PULL_INCOME_PER_PULL = 0.75;
export const PULL_TIME_MIN_SEC = 40;
export const PULL_TIME_MAX_SEC = 360;
export const PULL_TIME_RAMP = 120;
export const PULL_LATE_SLOWDOWN = 600;

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
/** Operar gasta una orden; cada orden vale CLICK_SECONDS segundos de ingresos (mínimo CLICK_MIN). */
export const CLICK_SECONDS = 3;
export const CLICK_MIN = 1;
/** Órdenes disponibles como máximo y segundos que tarda en recuperarse una. Limitan el juego manual. */
export const ORDERS_MAX = 10;
export const ORDERS_REFILL_SECONDS = 10;

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
