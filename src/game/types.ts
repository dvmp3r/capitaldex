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

export interface SetProgress {
  id: string;
  name: string;
  owned: number;
  total: number;
  bonus: number; // bonus al completar (0.25 = +25 %)
  mult: number; // multiplicador actual
}
