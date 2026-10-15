import { t } from "../i18n";
import { RARITY_THRESHOLDS_USD } from "./balance";
import type { Company, Rarity } from "./types";

export function rarityLabel(r: Rarity): string {
  return t(`rarity.${r}`);
}

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
