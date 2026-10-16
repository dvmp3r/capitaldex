/**
 * Prestigio: "Fundar un holding". El jugador cambia la partida actual por influencia, una moneda
 * permanente que da +2 % de ingresos por punto y se gasta en mejoras del holding que arrancan con él
 * cada nueva partida. La colección descubierta, los logros y las estadísticas no se pierden.
 */

/** Influencia total que corresponde a un capital generado acumulado (todas las partidas). */
export function influenceFor(lifetimeEarned: number): number {
  if (lifetimeEarned <= 0) return 0;
  return Math.floor(Math.pow(lifetimeEarned / INFLUENCE_UNIT, INFLUENCE_EXP));
}

/** Capital acumulado necesario para la siguiente unidad de influencia. */
export function earnedForInfluence(influence: number): number {
  return Math.pow(influence, 1 / INFLUENCE_EXP) * INFLUENCE_UNIT;
}

/** 300 k generados → 1 de influencia; 10 M → 4; 1 000 M → 25; 10 000 M → 64; 1 B → 405. (16-oct-2026: Jorge veía el primer holding demasiado pronto con 100 k.) */
export const INFLUENCE_UNIT = 3e5;
export const INFLUENCE_EXP = 0.4;
/** Ingresos permanentes por punto de influencia (+2 % cada uno, compuesto suave). */
export const INFLUENCE_INCOME = 0.02;

export type HoldingUpgradeId = "seed" | "contacts" | "eye" | "manager" | "memory" | "press" | "desk";

export interface HoldingUpgrade {
  id: HoldingUpgradeId;
  title: string;
  description: string;
  maxLevel: number;
  /** Coste en influencia del nivel n (1..maxLevel). */
  cost: (level: number) => number;
  /** Texto del efecto en el nivel dado. */
  effect: (level: number) => string;
}

export const HOLDING_UPGRADES: HoldingUpgrade[] = [
  {
    id: "seed", title: "Capital semilla", description: "Cada partida empieza con capital en caja.", maxLevel: 8,
    cost: (n) => Math.round(2 * Math.pow(1.7, n - 1)),
    effect: (n) => (n ? `${seedCapital(n).toLocaleString("es-ES")} de capital inicial` : "sin capital inicial"),
  },
  {
    id: "contacts", title: "Agenda de contactos", description: "Carteras gratis al empezar cada partida.", maxLevel: 10,
    cost: (n) => Math.round(2 * Math.pow(1.5, n - 1)),
    effect: (n) => `${contactsPulls(n)} carteras gratis de inicio`,
  },
  {
    id: "eye", title: "Ojo clínico heredado", description: "Más épicas y legendarias desde el primer minuto, para acabar la colección.", maxLevel: 10,
    cost: (n) => Math.round(3 * Math.pow(1.7, n - 1)),
    effect: (n) => `épica y legendaria ×${eyeOdds(n).toFixed(2)}`,
  },
  {
    id: "manager", title: "Gestor de confianza", description: "El gestor automático viene contratado desde el principio.", maxLevel: 5,
    cost: (n) => Math.round(4 * Math.pow(1.8, n - 1)),
    effect: (n) => (n ? `cartera automática cada ${managerSeconds(n)} s` : "sin gestor de inicio"),
  },
  {
    id: "memory", title: "Memoria del mercado", description: "Cada serie de titulares conserva niveles al fundar el holding.", maxLevel: 6,
    cost: (n) => Math.round(3 * Math.pow(1.8, n - 1)),
    effect: (n) => `${memoryLevels(n)} niveles conservados por serie`,
  },
  {
    id: "press", title: "Prensa amiga", description: "Las noticias de última hora llegan más a menudo.", maxLevel: 5,
    cost: (n) => Math.round(2 * Math.pow(1.8, n - 1)),
    effect: (n) => `noticias ×${pressFrequency(n).toFixed(2)}`,
  },
  {
    id: "desk", title: "Mesa ampliada", description: "Más órdenes de Operar disponibles.", maxLevel: 3,
    cost: (n) => Math.round(3 * Math.pow(2, n - 1)),
    effect: (n) => `+${deskOrders(n)} órdenes máximas`,
  },
];

export const HOLDING_BY_ID: Map<HoldingUpgradeId, HoldingUpgrade> = new Map(HOLDING_UPGRADES.map((u) => [u.id, u]));

export type HoldingLevels = Partial<Record<HoldingUpgradeId, number>>;

export const seedCapital = (n: number) => (n <= 0 ? 0 : Math.round(1000 * Math.pow(4, n - 1)));
export const contactsPulls = (n: number) => n * 3;
export const eyeOdds = (n: number) => Math.pow(1.12, n);
export const managerSeconds = (n: number) => (n <= 0 ? 0 : Math.round(240 * Math.pow(0.7, n - 1)));
export const memoryLevels = (n: number) => n * 2;
export const pressFrequency = (n: number) => Math.pow(1.15, n);
export const deskOrders = (n: number) => n * 5;

/** Efectos permanentes del holding sobre los multiplicadores. */
export interface PrestigeEffects {
  /** Multiplicador global de ingresos por influencia acumulada. */
  global: number;
  oddsMult: number;
  /** Segundos entre carteras automáticas garantizados (0 = ninguno). */
  autoPullSeconds: number;
  newsFrequency: number;
  extraOrders: number;
}

export function prestigeEffects(influenceEarned: number, holding: HoldingLevels): PrestigeEffects {
  return {
    global: 1 + INFLUENCE_INCOME * influenceEarned,
    oddsMult: eyeOdds(holding.eye ?? 0),
    autoPullSeconds: managerSeconds(holding.manager ?? 0),
    newsFrequency: pressFrequency(holding.press ?? 0),
    extraOrders: deskOrders(holding.desk ?? 0),
  };
}

export function holdingCost(id: HoldingUpgradeId, level: number): number {
  return HOLDING_BY_ID.get(id)!.cost(level);
}
