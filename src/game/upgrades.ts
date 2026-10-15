import { CLICK_SECONDS, OFFLINE_CAP_SECONDS, OFFLINE_RATE } from "./balance";
import { REGION_NAME, type Region } from "./regions";
import { RARITIES, type Rarity } from "./types";

/**
 * Mejoras permanentes presentadas como titulares de prensa. Se compran con capital
 * y multiplican los ingresos (o mejoran el bróker, el clic, el progreso offline, las noticias).
 * Los textos son contenido del juego (como los nombres de empresa); se traducirán en la fase 2.
 */
export type UpgradeEffect =
  | { kind: "sector"; sector: string; mult: number }
  | { kind: "region"; region: Region; mult: number }
  | { kind: "rarity"; rarity: Rarity; mult: number }
  | { kind: "global"; mult: number }
  | { kind: "gachaDiscount"; pct: number }
  | { kind: "clickSeconds"; add: number }
  | { kind: "offlineRate"; set: number }
  | { kind: "offlineCapHours"; set: number }
  | { kind: "newsFrequency"; mult: number }
  | { kind: "newsDuration"; mult: number };

export interface Requirement {
  companies?: number;
  inSector?: [string, number];
  inRegion?: [Region, number];
  ofRarity?: [Rarity, number];
  pulls?: number;
  upgrade?: string;
}

export interface Upgrade {
  id: string;
  /** Categoría visible: "Energía", "Europa", "Legendarias", "Mercado", "Bróker"… */
  category: string;
  headline: string;
  body: string;
  effect: UpgradeEffect;
  cost: number;
  requires?: Requirement;
}

/** Contexto del jugador para comprobar requisitos. */
export interface PlayerContext {
  companies: number;
  pulls: number;
  bySector: Record<string, number>;
  byRegion: Record<Region, number>;
  byRarity: Record<Rarity, number>;
  owned: Set<string>;
}

export interface Multipliers {
  global: number;
  sector: Record<string, number>;
  region: Record<Region, number>;
  rarity: Record<Rarity, number>;
  gachaCost: number; // 1 = sin descuento
  clickSeconds: number;
  offlineRate: number;
  offlineCapSeconds: number;
  newsFrequency: number;
  newsDuration: number;
}

export interface Boost {
  id: string;
  headline: string;
  effect: UpgradeEffect;
  until: number; // epoch ms
}

const SECTOR_HEADLINES: Record<string, [string, string][]> = {
  "Energía": [
    ["Rumores de acuerdo entre EE. UU. e Irán", "El crudo se dispara en apertura y las petroleras lideran el índice."],
    ["La OPEP recorta la producción", "El barril supera los 100 $ y los márgenes de refino se ensanchan."],
    ["Crisis energética global", "Las energéticas encadenan trimestres de beneficio récord."],
  ],
  "Tecnología": [
    ["La IA generativa dispara la demanda de chips", "Los fabricantes de semiconductores agotan su capacidad hasta 2028."],
    ["Las grandes tecnológicas baten previsiones", "Resultados récord y recompras masivas de acciones."],
    ["Nace la plataforma dominante de la década", "El sector tecnológico marca el ritmo de toda la bolsa."],
  ],
  "Finanzas": [
    ["Los bancos centrales suben tipos", "La banca gana margen de interés y repunta en bolsa."],
    ["Ola de fusiones bancarias", "Europa y EE. UU. viven la mayor consolidación en veinte años."],
    ["La banca de inversión bate su mejor año", "Comisiones récord por salidas a bolsa y fusiones."],
  ],
  "Salud": [
    ["Aprobado un fármaco superventas contra la obesidad", "Las farmacéuticas revisan al alza sus previsiones."],
    ["Avance histórico en terapias génicas", "La biotecnología atrae capital como no se veía desde 2000."],
    ["El envejecimiento global duplica el gasto sanitario", "Hospitales, aseguradoras y laboratorios crecen a doble dígito."],
  ],
  "Consumo cíclico": [
    ["Black Friday de récord", "Las ventas minoristas superan todas las previsiones."],
    ["El turismo mundial toca máximos históricos", "Aerolíneas, hoteles y lujo llenan sus reservas."],
    ["Boom del lujo en Asia", "Las marcas de moda y automoción premium disparan sus márgenes."],
  ],
  "Consumo básico": [
    ["La inflación de alimentos engorda los márgenes", "Las grandes marcas trasladan precios sin perder volumen."],
    ["Guerra de precios: ganan las grandes cadenas", "Los supermercados líderes absorben cuota de los pequeños."],
    ["Las marcas de confianza conquistan el mundo", "Demanda global estable y dividendos crecientes."],
  ],
  "Comunicación": [
    ["Las plataformas de streaming suben precios", "Y los suscriptores se quedan: ingresos recurrentes al alza."],
    ["Fusión de dos gigantes de las telecomunicaciones", "Nace el mayor operador del continente."],
    ["La publicidad digital bate récords", "Los grandes medios y redes sociales capturan todo el crecimiento."],
  ],
  "Industria": [
    ["Plan de infraestructuras de un billón de dólares", "Constructoras y maquinaria pesada, a pleno rendimiento."],
    ["Rearme europeo: contratos de defensa récord", "Las industriales llenan carteras de pedidos para una década."],
    ["Relocalización industrial a gran escala", "Fábricas de vuelta a casa: la industria vive su segundo siglo."],
  ],
  "Materiales": [
    ["El cobre, en máximos por la transición energética", "Las mineras disparan sus beneficios."],
    ["Escasez de litio y tierras raras", "Quien tiene la mina tiene el precio."],
    ["Superciclo de materias primas", "Diez años de demanda estructural por delante."],
  ],
  "Inmobiliario": [
    ["Bajan las hipotecas y vuelve la demanda", "Las inmobiliarias cotizadas repuntan con fuerza."],
    ["Boom de centros de datos y naves logísticas", "El ladrillo del siglo XXI se alquila antes de construirse."],
    ["Las grandes ciudades agotan su suelo", "Los propietarios fijan las rentas."],
  ],
  "Servicios públicos": [
    ["Ola de calor: récord de demanda eléctrica", "Las eléctricas facturan como nunca."],
    ["Las renovables marcan el precio", "Las utilities verdes cotizan con prima."],
    ["Electrificación total", "Coches, calefacción e industria: la red se duplica."],
  ],
  "Otros": [
    ["Un conglomerado sorprende al mercado", "Negocios diversificados, resultados sólidos."],
    ["Los holdings industriales reorganizan sus carteras", "Más foco, más valor."],
    ["El capital paciente gana la partida", "Los grupos diversificados lideran el ciclo."],
  ],
};

const SECTOR_TIERS: { mult: number; cost: number; need: number }[] = [
  { mult: 2, cost: 1_500, need: 3 },
  { mult: 2, cost: 40_000, need: 8 },
  { mult: 3, cost: 1_200_000, need: 15 },
];

const REGION_HEADLINES: Record<Region, [string, string][]> = {
  US: [
    ["La Reserva Federal baja tipos", "Wall Street en máximos históricos."],
    ["Rally del S&P 500", "El dinero de los fondos de pensiones entra a raudales."],
    ["La década americana", "Las empresas de EE. UU. dominan todos los sectores."],
  ],
  EU: [
    ["El BCE baja tipos", "La bolsa europea respira y los bancos lideran."],
    ["Llegan los fondos europeos", "Infraestructura, energía e industria se benefician."],
    ["Unión de los mercados de capitales", "Europa cotiza por fin como un solo mercado."],
  ],
  ASIA: [
    ["China lanza un plan de estímulo", "Las bolsas asiáticas se disparan."],
    ["India crece al 8 %", "El mercado emergente favorito de los inversores."],
    ["El siglo asiático", "Tokio, Seúl, Taipéi y Bombay marcan el paso."],
  ],
  LATAM: [
    ["Entra capital en los mercados emergentes", "Brasil y México lideran las subidas."],
    ["Superávit de materias primas", "Latinoamérica exporta como nunca."],
    ["Grado de inversión para toda la región", "Los grandes fondos vuelven al continente."],
  ],
  OTHER: [
    ["Los fondos soberanos salen de compras", "Canadá, Australia y el Golfo reciben inversión récord."],
    ["Minería y energía en el hemisferio sur", "Beneficios récord en los grandes exportadores."],
    ["Nuevas rutas comerciales", "El resto del mundo deja de ser periferia."],
  ],
};

const REGION_TIERS: { mult: number; cost: number; need: number }[] = [
  { mult: 2, cost: 8_000, need: 5 },
  { mult: 2, cost: 250_000, need: 15 },
  { mult: 3, cost: 6_000_000, need: 40 },
];

const RARITY_HEADLINES: Record<Rarity, [string, string][]> = {
  comun: [
    ["Las pequeñas cotizadas lideran el rebote", "Los analistas redescubren el valor olvidado."],
    ["Rotación hacia las empresas medianas", "El dinero inteligente baja de las grandes."],
  ],
  poco_comun: [
    ["Las medianas crecen más que nadie", "Beneficios al alza en el segundo escalón de la bolsa."],
    ["Fiebre de opas sobre las medianas", "Los grandes pagan primas del 40 %."],
  ],
  rara: [
    ["Las grandes capitalizaciones recuperan el liderazgo", "Dividendos sólidos y recompras."],
    ["Los índices se concentran", "Las 100 mayores pesan más que nunca."],
  ],
  epica: [
    ["Las gigantes presentan resultados récord", "Márgenes imposibles para el resto del mercado."],
    ["Los fondos pasivos solo compran gigantes", "Cuanto más grande, más sube."],
  ],
  legendaria: [
    ["El club del billón de dólares", "Las legendarias capturan la mitad de las ganancias mundiales."],
    ["Monopolios de facto", "Nadie puede competir con las legendarias."],
  ],
};
const RARITY_TIERS: Record<Rarity, { costs: [number, number]; need: number }> = {
  comun: { costs: [3_000, 90_000], need: 5 },
  poco_comun: { costs: [12_000, 350_000], need: 3 },
  rara: { costs: [60_000, 1_800_000], need: 2 },
  epica: { costs: [300_000, 9_000_000], need: 1 },
  legendaria: { costs: [1_500_000, 45_000_000], need: 1 },
};

function build(): Upgrade[] {
  const out: Upgrade[] = [];
  for (const [sector, lines] of Object.entries(SECTOR_HEADLINES)) {
    lines.forEach(([headline, body], i) => {
      const tier = SECTOR_TIERS[i];
      out.push({
        id: `sector:${sector}:${i + 1}`,
        category: sector,
        headline,
        body,
        effect: { kind: "sector", sector, mult: tier.mult },
        cost: tier.cost,
        requires: { inSector: [sector, tier.need], ...(i > 0 ? { upgrade: `sector:${sector}:${i}` } : {}) },
      });
    });
  }
  for (const region of Object.keys(REGION_HEADLINES) as Region[]) {
    REGION_HEADLINES[region].forEach(([headline, body], i) => {
      const tier = REGION_TIERS[i];
      out.push({
        id: `region:${region}:${i + 1}`,
        category: REGION_NAME[region],
        headline,
        body,
        effect: { kind: "region", region, mult: tier.mult },
        cost: tier.cost,
        requires: { inRegion: [region, tier.need], ...(i > 0 ? { upgrade: `region:${region}:${i}` } : {}) },
      });
    });
  }
  for (const rarity of RARITIES) {
    RARITY_HEADLINES[rarity].forEach(([headline, body], i) => {
      const t = RARITY_TIERS[rarity];
      out.push({
        id: `rarity:${rarity}:${i + 1}`,
        category: `Rareza`,
        headline,
        body,
        effect: { kind: "rarity", rarity, mult: i === 0 ? 2 : 3 },
        cost: t.costs[i],
        requires: { ofRarity: [rarity, t.need], ...(i > 0 ? { upgrade: `rarity:${rarity}:${i}` } : {}) },
      });
    });
  }
  const globals: [string, string, number, number, number][] = [
    ["Rally de fin de año", "Todo sube: los gestores maquillan carteras.", 2, 20_000, 10],
    ["Los fondos de pensiones entran en bolsa", "Compras masivas en todos los sectores.", 2, 500_000, 40],
    ["La década dorada de la bolsa", "Crecimiento, tipos bajos y beneficios récord.", 3, 15_000_000, 100],
    ["Tu holding entra en el índice mundial", "Todos los fondos indexados tienen que comprarte.", 3, 400_000_000, 200],
  ];
  globals.forEach(([headline, body, mult, cost, need], i) => {
    out.push({ id: `global:${i + 1}`, category: "Mercado", headline, body, effect: { kind: "global", mult }, cost, requires: { companies: need, ...(i > 0 ? { upgrade: `global:${i}` } : {}) } });
  });
  const broker: Upgrade[] = [
    { id: "gacha:1", category: "Bróker", headline: "Tu bróker te rebaja las comisiones", body: "Las carteras cuestan un 10 % menos.", effect: { kind: "gachaDiscount", pct: 10 }, cost: 5_000, requires: { pulls: 10 } },
    { id: "gacha:2", category: "Bróker", headline: "Cuenta premium con comisiones mínimas", body: "Las carteras cuestan otro 15 % menos.", effect: { kind: "gachaDiscount", pct: 15 }, cost: 150_000, requires: { pulls: 40, upgrade: "gacha:1" } },
    { id: "gacha:3", category: "Bróker", headline: "Asiento propio en la bolsa", body: "Las carteras cuestan otro 20 % menos.", effect: { kind: "gachaDiscount", pct: 20 }, cost: 4_000_000, requires: { pulls: 120, upgrade: "gacha:2" } },
    { id: "click:1", category: "Mesa de operaciones", headline: "Terminal profesional", body: "Operar vale 10 segundos más de ingresos.", effect: { kind: "clickSeconds", add: 10 }, cost: 2_500, requires: { pulls: 5 } },
    { id: "click:2", category: "Mesa de operaciones", headline: "Mesa de trading con tres pantallas", body: "Operar vale 30 segundos más de ingresos.", effect: { kind: "clickSeconds", add: 30 }, cost: 80_000, requires: { upgrade: "click:1" } },
    { id: "click:3", category: "Mesa de operaciones", headline: "Algoritmo de alta frecuencia", body: "Operar vale 2 minutos más de ingresos.", effect: { kind: "clickSeconds", add: 120 }, cost: 2_500_000, requires: { upgrade: "click:2" } },
    { id: "offline:1", category: "Mesa de operaciones", headline: "Operaciones nocturnas en Asia", body: "Progreso offline al 75 %.", effect: { kind: "offlineRate", set: 0.75 }, cost: 50_000, requires: { companies: 15 } },
    { id: "offline:2", category: "Mesa de operaciones", headline: "Equipo de guardia 24 horas", body: "Progreso offline al 100 %.", effect: { kind: "offlineRate", set: 1 }, cost: 1_500_000, requires: { upgrade: "offline:1" } },
    { id: "offline:3", category: "Mesa de operaciones", headline: "Gestor automático de carteras", body: "El progreso offline cubre hasta 24 horas.", effect: { kind: "offlineCapHours", set: 24 }, cost: 300_000, requires: { upgrade: "offline:1" } },
    { id: "news:1", category: "Agencia de noticias", headline: "Suscripción a la agencia de noticias", body: "Las noticias de última hora llegan un 50 % más a menudo.", effect: { kind: "newsFrequency", mult: 1.5 }, cost: 30_000, requires: { pulls: 15 } },
    { id: "news:2", category: "Agencia de noticias", headline: "Contactos en el parqué", body: "Los efectos de las noticias duran un 50 % más.", effect: { kind: "newsDuration", mult: 1.5 }, cost: 120_000, requires: { upgrade: "news:1" } },
    { id: "news:3", category: "Agencia de noticias", headline: "Terminal de noticias en tiempo real", body: "Las noticias llegan el doble de a menudo.", effect: { kind: "newsFrequency", mult: 2 }, cost: 3_000_000, requires: { upgrade: "news:2" } },
  ];
  return [...out, ...broker];
}

export const UPGRADES: Upgrade[] = build();
export const UPGRADE_BY_ID: Map<string, Upgrade> = new Map(UPGRADES.map((u) => [u.id, u]));

export function requirementMet(req: Requirement | undefined, ctx: PlayerContext): boolean {
  if (!req) return true;
  if (req.companies !== undefined && ctx.companies < req.companies) return false;
  if (req.pulls !== undefined && ctx.pulls < req.pulls) return false;
  if (req.inSector && (ctx.bySector[req.inSector[0]] ?? 0) < req.inSector[1]) return false;
  if (req.inRegion && (ctx.byRegion[req.inRegion[0]] ?? 0) < req.inRegion[1]) return false;
  if (req.ofRarity && (ctx.byRarity[req.ofRarity[0]] ?? 0) < req.ofRarity[1]) return false;
  if (req.upgrade && !ctx.owned.has(req.upgrade)) return false;
  return true;
}

/** Texto del requisito pendiente (el primero que no se cumple), o null si se cumplen todos. */
export function requirementText(req: Requirement | undefined, ctx: PlayerContext, rarityLabel: (r: Rarity) => string): string | null {
  if (!req) return null;
  if (req.upgrade && !ctx.owned.has(req.upgrade)) return `Requiere "${UPGRADE_BY_ID.get(req.upgrade)?.headline ?? req.upgrade}"`;
  if (req.companies !== undefined && ctx.companies < req.companies) return `Requiere ${req.companies} empresas distintas (tienes ${ctx.companies})`;
  if (req.pulls !== undefined && ctx.pulls < req.pulls) return `Requiere ${req.pulls} carteras abiertas (llevas ${ctx.pulls})`;
  if (req.inSector && (ctx.bySector[req.inSector[0]] ?? 0) < req.inSector[1]) return `Requiere ${req.inSector[1]} empresas de ${req.inSector[0]} (tienes ${ctx.bySector[req.inSector[0]] ?? 0})`;
  if (req.inRegion && (ctx.byRegion[req.inRegion[0]] ?? 0) < req.inRegion[1]) return `Requiere ${req.inRegion[1]} empresas de ${REGION_NAME[req.inRegion[0]]} (tienes ${ctx.byRegion[req.inRegion[0]] ?? 0})`;
  if (req.ofRarity && (ctx.byRarity[req.ofRarity[0]] ?? 0) < req.ofRarity[1]) return `Requiere ${req.ofRarity[1]} ${rarityLabel(req.ofRarity[0]).toLowerCase()}${req.ofRarity[1] > 1 ? "s" : ""} (tienes ${ctx.byRarity[req.ofRarity[0]] ?? 0})`;
  return null;
}

export function baseMultipliers(): Multipliers {
  return {
    global: 1,
    sector: {},
    region: { US: 1, EU: 1, ASIA: 1, LATAM: 1, OTHER: 1 },
    rarity: { comun: 1, poco_comun: 1, rara: 1, epica: 1, legendaria: 1 },
    gachaCost: 1,
    clickSeconds: CLICK_SECONDS,
    offlineRate: OFFLINE_RATE,
    offlineCapSeconds: OFFLINE_CAP_SECONDS,
    newsFrequency: 1,
    newsDuration: 1,
  };
}

function apply(m: Multipliers, e: UpgradeEffect) {
  switch (e.kind) {
    case "sector": m.sector[e.sector] = (m.sector[e.sector] ?? 1) * e.mult; break;
    case "region": m.region[e.region] *= e.mult; break;
    case "rarity": m.rarity[e.rarity] *= e.mult; break;
    case "global": m.global *= e.mult; break;
    case "gachaDiscount": m.gachaCost *= 1 - e.pct / 100; break;
    case "clickSeconds": m.clickSeconds += e.add; break;
    case "offlineRate": m.offlineRate = Math.max(m.offlineRate, e.set); break;
    case "offlineCapHours": m.offlineCapSeconds = Math.max(m.offlineCapSeconds, e.set * 3600); break;
    case "newsFrequency": m.newsFrequency *= e.mult; break;
    case "newsDuration": m.newsDuration *= e.mult; break;
  }
}

/** Multiplicadores vigentes: mejoras compradas más noticias activas en `now`. */
export function computeMultipliers(owned: Iterable<string>, boosts: Boost[] = [], now = Date.now()): Multipliers {
  const m = baseMultipliers();
  for (const id of owned) {
    const u = UPGRADE_BY_ID.get(id);
    if (u) apply(m, u.effect);
  }
  for (const b of boosts) if (b.until > now) apply(m, b.effect);
  return m;
}

/** Texto corto del efecto: "Energía ×2", "Carteras −10 %"… */
export function effectLabel(e: UpgradeEffect, rarityLabel: (r: Rarity) => string): string {
  switch (e.kind) {
    case "sector": return `${e.sector} ×${e.mult}`;
    case "region": return `${REGION_NAME[e.region]} ×${e.mult}`;
    case "rarity": return `${rarityLabel(e.rarity)}s ×${e.mult}`;
    case "global": return `Todo ×${e.mult}`;
    case "gachaDiscount": return `Carteras −${e.pct} %`;
    case "clickSeconds": return `Operar +${e.add} s`;
    case "offlineRate": return `Offline ${Math.round(e.set * 100)} %`;
    case "offlineCapHours": return `Offline hasta ${e.set} h`;
    case "newsFrequency": return `Noticias ×${e.mult}`;
    case "newsDuration": return `Duración ×${e.mult}`;
  }
}
