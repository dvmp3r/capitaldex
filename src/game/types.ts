export type Rarity = "comun" | "poco_comun" | "rara" | "epica" | "legendaria";

/** De menor a mayor. */
export const RARITIES: Rarity[] = ["comun", "poco_comun", "rara", "epica", "legendaria"];

export interface Company {
  id: string; // ticker
  name: string;
  sector: string;
  industry: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  exchange: string;
  currency: string;
  marketCapUsd: number;
  revenueUsd: number | null;
  netIncomeUsd: number | null;
  dividendYield: number | null; // fracción
  pe: number | null;
  indices: string[];
  rarityOverride?: Rarity;
}

export interface Holding {
  shares: number;
  firstAt: number; // epoch ms
}

export type Holdings = Record<string, Holding>;

export interface GachaState {
  pulls: number; // carteras abiertas en total
  sinceEpic: number; // tiradas desde la última épica o superior
  sinceLegendary: number;
}

export interface PullResult {
  company: Company;
  rarity: Rarity;
  isNew: boolean;
  shares: number; // acciones tras la tirada
  pity: boolean;
}

export interface Stats {
  clicks: number;
  bestRarityRank: number; // -1 = ninguna tirada todavía
  playSeconds: number;
  startedAt: number;
}

/** Impulso temporal de una noticia de última hora. */
export interface ActiveBoost {
  id: string;
  headline: string;
  effect: import("./upgrades").UpgradeEffect;
  until: number; // epoch ms
}

/** Forma de la partida guardada (localStorage y archivos exportados). */
export interface SaveData {
  version: number;
  savedAt: number;
  capital: number;
  totalEarned: number;
  holdings: Holdings;
  gacha: GachaState;
  lastTick: number;
  stats: Stats;
  /** Desde la versión 2 */
  upgrades?: string[];
  boosts?: ActiveBoost[];
  freePulls?: number;
}

export interface SetProgress {
  id: string;
  name: string;
  owned: number;
  total: number;
  bonus: number; // bonus al completar (0.25 = +25 %)
  mult: number; // multiplicador actual
}
