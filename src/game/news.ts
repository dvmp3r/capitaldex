import type { UpgradeEffect } from "./upgrades";

/**
 * Noticias de última hora: aparecen cada pocos minutos durante unos segundos y, si el jugador
 * las aprovecha, dan un impulso temporal, capital o una cartera gratis. Premian estar presente.
 */
export type NewsItem =
  | { id: string; kind: "boost"; headline: string; effect: UpgradeEffect; durationSec: number; weight: number }
  | { id: string; kind: "capital"; headline: string; incomeSeconds: number; weight: number }
  | { id: string; kind: "freePull"; headline: string; weight: number };

export const NEWS_MIN_GAP_SEC = 150;
export const NEWS_MAX_GAP_SEC = 330;
export const NEWS_OFFER_SEC = 20;

const sectorNews: [string, string][] = [
  ["Energía", "Rumores de acuerdo entre EE. UU. e Irán: el crudo se dispara"],
  ["Tecnología", "Se filtran resultados récord de las grandes tecnológicas"],
  ["Finanzas", "Bajada de tipos sorpresa: la banca se dispara"],
  ["Salud", "Aprobación exprés de un fármaco estrella"],
  ["Consumo cíclico", "Colas en las tiendas: fiebre de compras"],
  ["Consumo básico", "Compras de pánico en los supermercados"],
  ["Comunicación", "Fusión sorpresa entre dos telecos"],
  ["Industria", "Contrato de defensa récord adjudicado hoy"],
  ["Materiales", "El cobre toca máximos históricos"],
  ["Inmobiliario", "Las hipotecas bajan medio punto de golpe"],
  ["Servicios públicos", "Ola de calor: la demanda eléctrica bate récords"],
];

export const NEWS: NewsItem[] = [
  ...sectorNews.map<NewsItem>(([sector, headline]) => ({
    id: `sector:${sector}`,
    kind: "boost",
    headline,
    effect: { kind: "sector", sector, mult: 3 },
    durationSec: 60,
    weight: 1,
  })),
  { id: "region:US", kind: "boost", headline: "Wall Street abre en máximos históricos", effect: { kind: "region", region: "US", mult: 3 }, durationSec: 60, weight: 1 },
  { id: "region:EU", kind: "boost", headline: "Rally en las bolsas europeas", effect: { kind: "region", region: "EU", mult: 3 }, durationSec: 60, weight: 1 },
  { id: "region:ASIA", kind: "boost", headline: "China sorprende al alza: Asia se dispara", effect: { kind: "region", region: "ASIA", mult: 3 }, durationSec: 60, weight: 1 },
  { id: "global:euforia", kind: "boost", headline: "Euforia en los mercados: todo sube", effect: { kind: "global", mult: 2 }, durationSec: 45, weight: 2 },
  { id: "capital:dividendo", kind: "capital", headline: "Dividendo extraordinario para los accionistas", incomeSeconds: 300, weight: 2 },
  { id: "capital:plusvalia", kind: "capital", headline: "Una opa sobre una de tus empresas te deja plusvalías", incomeSeconds: 600, weight: 1 },
  { id: "pull:regalo", kind: "freePull", headline: "Tu bróker te regala una cartera", weight: 1 },
];

/** Momento (ms) de la próxima noticia, con la frecuencia de las mejoras. */
export function scheduleNext(now: number, rng: () => number, frequencyMult = 1): number {
  const gap = NEWS_MIN_GAP_SEC + rng() * (NEWS_MAX_GAP_SEC - NEWS_MIN_GAP_SEC);
  return now + (gap / frequencyMult) * 1000;
}

export function pickNews(rng: () => number, pool: NewsItem[] = NEWS): NewsItem {
  const total = pool.reduce((s, n) => s + n.weight, 0);
  let r = rng() * total;
  for (const n of pool) {
    r -= n.weight;
    if (r < 0) return n;
  }
  return pool[pool.length - 1];
}
