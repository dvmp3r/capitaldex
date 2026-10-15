import type { Rarity } from "./types";

/**
 * Logros con recompensa. Se evalúan contra un resumen de la partida (AchievementContext);
 * la recompensa se aplica una sola vez al desbloquearse. Todos son umbrales: `metric(ctx) >= target`,
 * así la pantalla puede mostrar el progreso hacia cada uno.
 */
export type Reward =
  | { kind: "capital"; minutes: number } // minutos de ingresos actuales
  | { kind: "freePulls"; n: number }
  | { kind: "global"; mult: number }; // multiplicador permanente a todos los ingresos

export interface Achievement {
  id: string;
  title: string;
  description: string;
  reward: Reward;
  metric: (c: AchievementContext) => number;
  target: number;
  test: (c: AchievementContext) => boolean;
}

export interface AchievementContext {
  pulls: number;
  companies: number;
  totalEarned: number;
  clicks: number;
  newsTaken: number;
  maxShares: number;
  sectors: number;
  countries: number;
  setsCompleted: number;
  upgradeLevels: number;
  maxedSeries: number;
  byRarity: Record<Rarity, number>;
}

const A = (id: string, title: string, description: string, reward: Reward, metric: (c: AchievementContext) => number, target: number): Achievement => ({
  id, title, description, reward, metric, target, test: (c) => metric(c) >= target,
});

export const ACHIEVEMENTS: Achievement[] = [
  A("pull_1", "Primera cartera", "Abre tu primera cartera.", { kind: "freePulls", n: 1 }, (c) => c.pulls, 1),
  A("pull_10", "Diez carteras", "Abre 10 carteras.", { kind: "capital", minutes: 3 }, (c) => c.pulls, 10),
  A("pull_100", "Cien carteras", "Abre 100 carteras.", { kind: "capital", minutes: 10 }, (c) => c.pulls, 100),
  A("pull_500", "Quinientas carteras", "Abre 500 carteras.", { kind: "freePulls", n: 5 }, (c) => c.pulls, 500),
  A("rare_1", "Primera rara", "Consigue una empresa rara.", { kind: "capital", minutes: 5 }, (c) => c.byRarity.rara, 1),
  A("epic_1", "Primera épica", "Consigue una empresa épica.", { kind: "capital", minutes: 15 }, (c) => c.byRarity.epica, 1),
  A("legend_1", "Primera legendaria", "Consigue una empresa legendaria.", { kind: "freePulls", n: 3 }, (c) => c.byRarity.legendaria, 1),
  A("legend_5", "Club del billón", "Cinco legendarias distintas.", { kind: "global", mult: 1.1 }, (c) => c.byRarity.legendaria, 5),
  A("companies_50", "Coleccionista", "50 empresas distintas.", { kind: "capital", minutes: 10 }, (c) => c.companies, 50),
  A("companies_200", "Gran cartera", "200 empresas distintas.", { kind: "global", mult: 1.05 }, (c) => c.companies, 200),
  A("companies_500", "Medio mercado", "500 empresas distintas.", { kind: "global", mult: 1.1 }, (c) => c.companies, 500),
  A("companies_1000", "Casi todo el mercado", "1 000 empresas distintas.", { kind: "global", mult: 1.25 }, (c) => c.companies, 1000),
  A("shares_10", "Accionista", "10 acciones de una misma empresa.", { kind: "capital", minutes: 5 }, (c) => c.maxShares, 10),
  A("shares_50", "Accionista mayoritario", "50 acciones de una misma empresa.", { kind: "capital", minutes: 20 }, (c) => c.maxShares, 50),
  A("shares_100", "Dueño", "100 acciones de una misma empresa.", { kind: "global", mult: 1.05 }, (c) => c.maxShares, 100),
  A("sectors_all", "Diversificado", "Una empresa de cada uno de los 11 sectores.", { kind: "capital", minutes: 15 }, (c) => c.sectors, 11),
  A("countries_10", "Inversor global", "Empresas de 10 países.", { kind: "capital", minutes: 15 }, (c) => c.countries, 10),
  A("countries_25", "Ciudadano del mundo", "Empresas de 25 países.", { kind: "global", mult: 1.05 }, (c) => c.countries, 25),
  A("set_1", "Índice completo", "Completa un índice entero.", { kind: "global", mult: 1.05 }, (c) => c.setsCompleted, 1),
  A("set_5", "Cinco índices", "Completa cinco índices.", { kind: "global", mult: 1.1 }, (c) => c.setsCompleted, 5),
  A("upgrade_1", "Primer titular", "Compra tu primer titular.", { kind: "capital", minutes: 3 }, (c) => c.upgradeLevels, 1),
  A("upgrade_50", "Lector de prensa", "50 niveles de titulares.", { kind: "capital", minutes: 20 }, (c) => c.upgradeLevels, 50),
  A("series_max", "Serie al máximo", "Lleva una serie de titulares al nivel máximo.", { kind: "global", mult: 1.1 }, (c) => c.maxedSeries, 1),
  A("news_10", "Al tanto", "Aprovecha 10 noticias de última hora.", { kind: "capital", minutes: 10 }, (c) => c.newsTaken, 10),
  A("news_100", "Agencia propia", "Aprovecha 100 noticias.", { kind: "global", mult: 1.05 }, (c) => c.newsTaken, 100),
  A("clicks_100", "Operador", "Pulsa Operar 100 veces.", { kind: "capital", minutes: 5 }, (c) => c.clicks, 100),
  A("clicks_1000", "Mesa de trading", "Pulsa Operar 1 000 veces.", { kind: "freePulls", n: 3 }, (c) => c.clicks, 1000),
  A("earned_1m", "Primer millón", "Genera 1 M de capital en total.", { kind: "capital", minutes: 5 }, (c) => c.totalEarned, 1e6),
  A("earned_1b", "Mil millones", "Genera 1 000 M de capital en total.", { kind: "global", mult: 1.05 }, (c) => c.totalEarned, 1e9),
  A("earned_1t", "Un billón", "Genera 1 B de capital en total.", { kind: "global", mult: 1.1 }, (c) => c.totalEarned, 1e12),
];

export const ACHIEVEMENT_BY_ID: Map<string, Achievement> = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Logros que se cumplen ahora y aún no estaban desbloqueados. */
export function newlyUnlocked(ctx: AchievementContext, unlocked: Iterable<string>): Achievement[] {
  const have = new Set(unlocked);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.test(ctx));
}

/** Progreso 0..1 hacia un logro. */
export function progressOf(a: Achievement, ctx: AchievementContext): number {
  return Math.max(0, Math.min(1, a.metric(ctx) / a.target));
}

/** Multiplicador global permanente que suman los logros desbloqueados. */
export function achievementsMult(unlocked: Iterable<string>): number {
  let m = 1;
  for (const id of unlocked) {
    const a = ACHIEVEMENT_BY_ID.get(id);
    if (a && a.reward.kind === "global") m *= a.reward.mult;
  }
  return m;
}

export function rewardLabel(r: Reward): string {
  switch (r.kind) {
    case "capital": return `${r.minutes} min de ingresos`;
    case "freePulls": return `${r.n} cartera${r.n > 1 ? "s" : ""} gratis`;
    case "global": return `Todo ×${r.mult}`;
  }
}
