/** Regiones del juego: agrupan países para las mejoras y las noticias. */
export type Region = "US" | "EU" | "ASIA" | "LATAM" | "OTHER";

export const REGIONS: Region[] = ["US", "EU", "ASIA", "LATAM", "OTHER"];

export const REGION_NAME: Record<Region, string> = {
  US: "Estados Unidos",
  EU: "Europa",
  ASIA: "Asia y Pacífico",
  LATAM: "Latinoamérica",
  OTHER: "Resto del mundo",
};

const EU = new Set(["ES", "DE", "FR", "NL", "IT", "BE", "IE", "FI", "SE", "DK", "NO", "CH", "GB", "LU", "AT", "PT", "PL", "GR", "CZ", "HU"]);
const ASIA = new Set(["JP", "CN", "HK", "KR", "TW", "IN", "SG", "SA", "AU", "NZ", "ID", "MY", "TH", "AE", "QA", "IL"]);
const LATAM = new Set(["BR", "MX", "UY", "AR", "CL", "CO", "PE"]);

export function regionOf(countryCode: string): Region {
  if (countryCode === "US") return "US";
  if (EU.has(countryCode)) return "EU";
  if (ASIA.has(countryCode)) return "ASIA";
  if (LATAM.has(countryCode)) return "LATAM";
  return "OTHER";
}
