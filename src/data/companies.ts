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

const COUNTRY_NAME_ES: Record<string, string> = {
  US: "Estados Unidos", DE: "Alemania", ES: "España", GB: "Reino Unido", FR: "Francia", NL: "Países Bajos",
  JP: "Japón", CH: "Suiza", CN: "China", IE: "Irlanda", SE: "Suecia", IT: "Italia", IN: "India", AU: "Australia",
  DK: "Dinamarca", CA: "Canadá", KR: "Corea del Sur", FI: "Finlandia", HK: "Hong Kong", SA: "Arabia Saudí",
  BE: "Bélgica", NO: "Noruega", UY: "Uruguay", LU: "Luxemburgo", TW: "Taiwán", AT: "Austria", PT: "Portugal",
  SG: "Singapur", BR: "Brasil", MX: "México", IL: "Israel",
};

export function countryName(code: string): string {
  return COUNTRY_NAME_ES[code] ?? code;
}

/** Países presentes en el universo, ordenados por número de empresas (desc) y nombre. */
export const COUNTRIES: { code: string; name: string; count: number }[] = (() => {
  const counts = new Map<string, number>();
  for (const c of COMPANIES) counts.set(c.countryCode, (counts.get(c.countryCode) ?? 0) + 1);
  return [...counts]
    .map(([code, count]) => ({ code, name: countryName(code), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
})();
