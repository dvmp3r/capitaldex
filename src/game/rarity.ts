import { RARITY_THRESHOLDS_USD } from "./balance";
import type { Company, Rarity } from "./types";

export const RARITY_LABEL: Record<Rarity, string> = {
  comun: "Común",
  poco_comun: "Poco común",
  rara: "Rara",
  epica: "Épica",
  legendaria: "Legendaria",
};

export const RARITY_RANK: Record<Rarity, number> = {
  comun: 0,
  poco_comun: 1,
  rara: 2,
  epica: 3,
  legendaria: 4,
};

export function rarityOf(c: Company): Rarity {
  if (c.rarityOverride) return c.rarityOverride;
  const m = c.marketCapUsd;
  if (m >= RARITY_THRESHOLDS_USD.legendaria) return "legendaria";
  if (m >= RARITY_THRESHOLDS_USD.epica) return "epica";
  if (m >= RARITY_THRESHOLDS_USD.rara) return "rara";
  if (m >= RARITY_THRESHOLDS_USD.poco_comun) return "poco_comun";
  return "comun";
}
