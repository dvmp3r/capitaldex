import raw from "./companies.json";
import { rarityOf } from "../game/rarity";
import { RARITIES, type Company, type Rarity } from "../game/types";

/** Todas las empresas, ordenadas por capitalización descendente. */
export const COMPANIES: Company[] = raw as unknown as Company[];

export const BY_ID: Map<string, Company> = new Map(COMPANIES.map((c) => [c.id, c]));

/** Empresas agrupadas por rareza, para el gacha. */
export const POOL: Record<Rarity, Company[]> = Object.fromEntries(RARITIES.map((r) => [r, [] as Company[]])) as Record<Rarity, Company[]>;
for (const c of COMPANIES) POOL[rarityOf(c)].push(c);

/** id de set → tickers que lo componen. */
export const INDEX_MEMBERS: Record<string, string[]> = {};
for (const c of COMPANIES) {
  for (const idx of c.indices) (INDEX_MEMBERS[idx] ??= []).push(c.id);
}

export const SECTORS: string[] = [...new Set(COMPANIES.map((c) => c.sector))].sort((a, b) => a.localeCompare(b, "es"));
