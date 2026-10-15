import { CLICK_SECONDS, OFFLINE_CAP_SECONDS, OFFLINE_RATE } from "./balance";
import { REGION_NAME, type Region } from "./regions";
import { RARITIES, type Rarity } from "./types";

/**
 * Titulares: series de mejoras por niveles presentadas como noticias de prensa.
 * Cada nivel da un poco más que el anterior (curva creciente) y cuesta más; el titular
 * que se muestra cambia por tramos de niveles. Los textos son contenido del juego.
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
  | { kind: "newsDuration"; mult: number }
  | { kind: "autoPull"; seconds: number }
  | { kind: "oddsMult"; mult: number };

export type SeriesKind = UpgradeEffect["kind"];

export interface Series {
  id: string;
  category: string;
  kind: SeriesKind;
  /** Objetivo según el tipo: sector, región o rareza. */
  target?: string;
  /** Titulares por tramo de niveles: [titular, cuerpo]. */
  headlines: [string, string][];
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  /** Requisito para subir al nivel `level` (1..maxLevel). */
  requirement: (level: number) => Requirement | undefined;
}

export interface Requirement {
  companies?: number;
  inSector?: [string, number];
  inRegion?: [Region, number];
  ofRarity?: [Rarity, number];
  pulls?: number;
}

export interface PlayerContext {
  companies: number;
  pulls: number;
  bySector: Record<string, number>;
  byRegion: Record<Region, number>;
  byRarity: Record<Rarity, number>;
}

/** Niveles comprados por serie. */
export type UpgradeLevels = Record<string, number>;

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
  /** Segundos entre carteras automáticas; 0 = sin gestor. */
  autoPullSeconds: number;
  /** Multiplicador de la probabilidad de épica y legendaria (1 = base). */
  oddsMult: number;
}

export interface Boost {
  id: string;
  headline: string;
  effect: UpgradeEffect;
  until: number; // epoch ms
}

/* ---------- Curvas ---------- */

/** Bonus del nivel i de una serie multiplicativa: +5 % en el nivel 1, y cada nivel un 10 % más que el anterior. */
export function levelBonus(level: number): number {
  return 0.05 * Math.pow(1.1, level - 1);
}

/** Multiplicador acumulado de una serie multiplicativa hasta `level`. */
export function cumulativeMult(level: number): number {
  let m = 1;
  for (let i = 1; i <= level; i++) m *= 1 + levelBonus(i);
  return m;
}

export function seriesCost(s: Series, level: number): number {
  return Math.round(s.baseCost * Math.pow(s.costGrowth, level - 1));
}

/* ---------- Definición de series ---------- */

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

const RARITY_HEADLINES: Record<Rarity, [string, string][]> = {
  comun: [
    ["Las pequeñas cotizadas lideran el rebote", "Los analistas redescubren el valor olvidado."],
    ["Rotación hacia las empresas medianas", "El dinero inteligente baja de las grandes."],
    ["La revancha de las pequeñas", "Las comunes crecen más que nadie."],
  ],
  poco_comun: [
    ["Las medianas crecen más que nadie", "Beneficios al alza en el segundo escalón de la bolsa."],
    ["Fiebre de opas sobre las medianas", "Los grandes pagan primas del 40 %."],
    ["El escalón medio se hace grande", "Las poco comunes entran en los índices."],
  ],
  rara: [
    ["Las grandes capitalizaciones recuperan el liderazgo", "Dividendos sólidos y recompras."],
    ["Los índices se concentran", "Las 100 mayores pesan más que nunca."],
    ["Las raras marcan el ritmo", "Los gestores no pueden no tenerlas."],
  ],
  epica: [
    ["Las gigantes presentan resultados récord", "Márgenes imposibles para el resto del mercado."],
    ["Los fondos pasivos solo compran gigantes", "Cuanto más grande, más sube."],
    ["La era de las megacapitalizaciones", "Las épicas mandan en la bolsa."],
  ],
  legendaria: [
    ["El club del billón de dólares", "Las legendarias capturan la mitad de las ganancias mundiales."],
    ["Monopolios de facto", "Nadie puede competir con las legendarias."],
    ["Leyendas vivas", "Las legendarias valen más que países enteros."],
  ],
};
const RARITY_BASE_COST: Record<Rarity, number> = { comun: 2_500, poco_comun: 10_000, rara: 50_000, epica: 250_000, legendaria: 1_250_000 };
const RARITY_NEED: Record<Rarity, number> = { comun: 4, poco_comun: 2, rara: 2, epica: 1, legendaria: 1 };

function build(): Series[] {
  const out: Series[] = [];
  for (const [sector, headlines] of Object.entries(SECTOR_HEADLINES)) {
    out.push({
      id: `sector:${sector}`, category: sector, kind: "sector", target: sector, headlines,
      maxLevel: 25, baseCost: 1_200, costGrowth: 1.5,
      requirement: (level) => ({ inSector: [sector, 2 + level] }),
    });
  }
  for (const region of Object.keys(REGION_HEADLINES) as Region[]) {
    out.push({
      id: `region:${region}`, category: REGION_NAME[region], kind: "region", target: region, headlines: REGION_HEADLINES[region],
      maxLevel: 25, baseCost: 6_000, costGrowth: 1.5,
      requirement: (level) => ({ inRegion: [region, 3 + 2 * level] }),
    });
  }
  for (const rarity of RARITIES) {
    out.push({
      id: `rarity:${rarity}`, category: "Rareza", kind: "rarity", target: rarity, headlines: RARITY_HEADLINES[rarity],
      maxLevel: 15, baseCost: RARITY_BASE_COST[rarity], costGrowth: 1.6,
      requirement: (level) => ({ ofRarity: [rarity, RARITY_NEED[rarity] + Math.floor(level / 2) * RARITY_NEED[rarity]] }),
    });
  }
  out.push({
    id: "global", category: "Mercado", kind: "global",
    headlines: [
      ["Rally de fin de año", "Todo sube: los gestores maquillan carteras."],
      ["Los fondos de pensiones entran en bolsa", "Compras masivas en todos los sectores."],
      ["La década dorada de la bolsa", "Crecimiento, tipos bajos y beneficios récord."],
    ],
    maxLevel: 25, baseCost: 15_000, costGrowth: 1.6,
    requirement: (level) => ({ companies: 8 + 6 * level }),
  });
  out.push({
    id: "gacha", category: "Bróker", kind: "gachaDiscount",
    headlines: [
      ["Tu bróker te rebaja las comisiones", "Cada nivel abarata un poco más las carteras."],
      ["Cuenta premium con comisiones mínimas", "Las carteras siguen bajando de precio."],
      ["Asiento propio en la bolsa", "Comisiones de insider."],
    ],
    maxLevel: 10, baseCost: 4_000, costGrowth: 1.8,
    requirement: (level) => ({ pulls: 5 + 10 * level }),
  });
  out.push({
    id: "click", category: "Mesa de operaciones", kind: "clickSeconds",
    headlines: [
      ["Terminal profesional", "Cada orden vale más segundos de ingresos."],
      ["Mesa de trading con tres pantallas", "Cada orden rinde más."],
      ["Algoritmo de alta frecuencia", "Órdenes a lo grande (pero siguen siendo 10)."],
    ],
    maxLevel: 10, baseCost: 2_000, costGrowth: 1.7,
    requirement: (level) => ({ pulls: 3 + 6 * level }),
  });
  out.push({
    id: "offlineRate", category: "Mesa de operaciones", kind: "offlineRate",
    headlines: [
      ["Operaciones nocturnas en Asia", "El progreso offline rinde un poco más."],
      ["Equipo de guardia 24 horas", "Casi todo el tiempo ausente cuenta."],
      ["Gestor automático de carteras", "Ausente o no, la cartera trabaja."],
    ],
    maxLevel: 10, baseCost: 40_000, costGrowth: 1.6,
    requirement: (level) => ({ companies: 10 + 5 * level }),
  });
  out.push({
    id: "offlineCap", category: "Mesa de operaciones", kind: "offlineCapHours",
    headlines: [
      ["Un ayudante por las tardes", "El progreso offline cubre más horas."],
      ["Turno de noche", "Hasta un día entero de ausencia."],
      ["Oficinas en tres continentes", "Siempre hay un mercado abierto."],
    ],
    maxLevel: 10, baseCost: 60_000, costGrowth: 1.6,
    requirement: (level) => ({ companies: 12 + 6 * level }),
  });
  out.push({
    id: "newsFrequency", category: "Agencia de noticias", kind: "newsFrequency",
    headlines: [
      ["Suscripción a la agencia de noticias", "Las noticias de última hora llegan más a menudo."],
      ["Contactos en el parqué", "Te enteras antes que nadie."],
      ["Terminal de noticias en tiempo real", "Nada se te escapa."],
    ],
    maxLevel: 10, baseCost: 25_000, costGrowth: 1.7,
    requirement: (level) => ({ pulls: 10 + 10 * level }),
  });
  out.push({
    id: "newsDuration", category: "Agencia de noticias", kind: "newsDuration",
    headlines: [
      ["Un buen titular dura más", "Los efectos de las noticias se alargan."],
      ["Editorial en portada", "Las noticias se comentan durante días."],
      ["Tu agencia marca la agenda", "Cada noticia se convierte en tendencia."],
    ],
    maxLevel: 10, baseCost: 80_000, costGrowth: 1.7,
    requirement: (level) => ({ pulls: 20 + 15 * level }),
  });
  out.push({
    id: "odds", category: "Ojo clínico", kind: "oddsMult",
    headlines: [
      ["Contratas a un analista de carteras", "Más probabilidad de épica y legendaria en cada cartera."],
      ["Tu equipo huele las oportunidades", "La suerte se entrena: épicas y legendarias cada vez más cerca."],
      ["Información privilegiada (legal, claro)", "Las joyas del mercado ya no se esconden de ti."],
    ],
    maxLevel: 15, baseCost: 8_000, costGrowth: 1.75,
    requirement: (level) => ({ pulls: 20 + 15 * level }),
  });
  out.push({
    id: "autoPull", category: "Gestor automático", kind: "autoPull",
    headlines: [
      ["Contratas a un becario", "Abre una cartera por ti cada cinco minutos (si hay capital)."],
      ["Un gestor con experiencia", "Cada nivel acorta el tiempo entre carteras automáticas."],
      ["Mesa de gestores en tres turnos", "Las carteras se abren casi solas."],
    ],
    maxLevel: 10, baseCost: 25_000, costGrowth: 1.9,
    requirement: (level) => ({ pulls: 30 + 20 * level }),
  });
  return out;
}

export const SERIES: Series[] = build();
export const SERIES_BY_ID: Map<string, Series> = new Map(SERIES.map((s) => [s.id, s]));

/** Titular que se muestra según el nivel actual (tres tramos). */
export function seriesHeadline(s: Series, level: number): [string, string] {
  const i = Math.min(s.headlines.length - 1, Math.floor((level / s.maxLevel) * s.headlines.length));
  return s.headlines[i];
}

/** Valor acumulado de una serie en un nivel: multiplicador, descuento, segundos, etc. */
export function seriesValue(s: Series, level: number): number {
  switch (s.kind) {
    case "sector": case "region": case "rarity": case "global": case "newsFrequency": case "newsDuration":
      return cumulativeMult(level);
    case "gachaDiscount":
      return 1 - Math.pow(0.98, level); // 2 % por nivel, compuesto: 18 % en el nivel 10
    case "clickSeconds": {
      let add = 0;
      for (let i = 1; i <= level; i++) add += 0.5 * Math.pow(1.2, i - 1);
      return add; // +0,5 s, +0,6 s, +0,7 s… ≈ +13 s en el nivel 10 (16 s por orden)
    }
    case "offlineRate":
      return Math.min(1, OFFLINE_RATE + 0.05 * level);
    case "offlineCapHours":
      return OFFLINE_CAP_SECONDS / 3600 + 1.6 * level; // 8 h → 24 h
    case "autoPull":
      return level <= 0 ? 0 : Math.round(300 * Math.pow(0.78, level - 1)); // 300 s → 32 s en el nivel 10
    case "oddsMult":
      return Math.pow(1.1, level); // ×1,1 por nivel: ×4,2 en el nivel 15 (legendaria 0,3 % → 1,25 %)
  }
}

/** Texto del valor acumulado: "×1,34", "−12 %", "+14 s", "85 %", "16 h". */
export function seriesValueLabel(s: Series, level: number): string {
  const v = seriesValue(s, level);
  switch (s.kind) {
    case "gachaDiscount": return `−${Math.round(v * 100)} %`;
    case "clickSeconds": return `+${v.toFixed(1)} s`;
    case "offlineRate": return `${Math.round(v * 100)} %`;
    case "offlineCapHours": return `${Math.round(v)} h`;
    case "autoPull": return v ? `cada ${v} s` : "no";
    case "oddsMult": return `×${v.toFixed(2)}`;
    default: return `×${v.toFixed(2)}`;
  }
}

export function seriesTargetLabel(s: Series, rarityLabel: (r: Rarity) => string): string {
  switch (s.kind) {
    case "sector": return s.target!;
    case "region": return REGION_NAME[s.target as Region];
    case "rarity": return `${rarityLabel(s.target as Rarity)}s`;
    case "global": return "Todo";
    case "gachaDiscount": return "Carteras";
    case "clickSeconds": return "Operar";
    case "offlineRate": return "Offline";
    case "offlineCapHours": return "Offline";
    case "newsFrequency": return "Noticias";
    case "newsDuration": return "Duración";
    case "autoPull": return "Cartera automática";
    case "oddsMult": return "Épica y legendaria";
  }
}

export function requirementMet(req: Requirement | undefined, ctx: PlayerContext): boolean {
  if (!req) return true;
  if (req.companies !== undefined && ctx.companies < req.companies) return false;
  if (req.pulls !== undefined && ctx.pulls < req.pulls) return false;
  if (req.inSector && (ctx.bySector[req.inSector[0]] ?? 0) < req.inSector[1]) return false;
  if (req.inRegion && (ctx.byRegion[req.inRegion[0]] ?? 0) < req.inRegion[1]) return false;
  if (req.ofRarity && (ctx.byRarity[req.ofRarity[0]] ?? 0) < req.ofRarity[1]) return false;
  return true;
}

/** Texto del requisito pendiente (el primero que no se cumple), o null si se cumplen todos. */
export function requirementText(req: Requirement | undefined, ctx: PlayerContext, rarityLabel: (r: Rarity) => string): string | null {
  if (!req) return null;
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
    autoPullSeconds: 0,
    oddsMult: 1,
  };
}

function applySeries(m: Multipliers, s: Series, level: number) {
  if (level <= 0) return;
  const v = seriesValue(s, level);
  switch (s.kind) {
    case "sector": m.sector[s.target!] = (m.sector[s.target!] ?? 1) * v; break;
    case "region": m.region[s.target as Region] *= v; break;
    case "rarity": m.rarity[s.target as Rarity] *= v; break;
    case "global": m.global *= v; break;
    case "gachaDiscount": m.gachaCost *= 1 - v; break;
    case "clickSeconds": m.clickSeconds += v; break;
    case "offlineRate": m.offlineRate = Math.max(m.offlineRate, v); break;
    case "offlineCapHours": m.offlineCapSeconds = Math.max(m.offlineCapSeconds, v * 3600); break;
    case "newsFrequency": m.newsFrequency *= v; break;
    case "newsDuration": m.newsDuration *= v; break;
    case "autoPull": m.autoPullSeconds = v; break;
    case "oddsMult": m.oddsMult *= v; break;
  }
}

function applyBoost(m: Multipliers, e: UpgradeEffect) {
  switch (e.kind) {
    case "sector": m.sector[e.sector] = (m.sector[e.sector] ?? 1) * e.mult; break;
    case "region": m.region[e.region] *= e.mult; break;
    case "rarity": m.rarity[e.rarity] *= e.mult; break;
    case "global": m.global *= e.mult; break;
    default: break;
  }
}

/** Multiplicadores vigentes: niveles comprados más noticias activas en `now`. */
export function computeMultipliers(levels: UpgradeLevels, boosts: Boost[] = [], now = Date.now(), extraGlobal = 1): Multipliers {
  const m = baseMultipliers();
  m.global *= extraGlobal;
  for (const [id, level] of Object.entries(levels)) {
    const s = SERIES_BY_ID.get(id);
    if (s) applySeries(m, s, Math.min(level, s.maxLevel));
  }
  for (const b of boosts) if (b.until > now) applyBoost(m, b.effect);
  return m;
}

/** Texto corto del efecto de una noticia: "Energía ×3", "Todo ×2"… */
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
    case "autoPull": return `Cartera automática cada ${e.seconds} s`;
    case "oddsMult": return `Épica y legendaria ×${e.mult}`;
  }
}

/** Migra los ids antiguos ("sector:Energía:2") a niveles por serie. */
export function migrateLegacyUpgrades(ids: string[]): UpgradeLevels {
  const levels: UpgradeLevels = {};
  for (const id of ids) {
    const m = /^(sector|region|rarity):(.+):(\d+)$/.exec(id);
    if (m) {
      const key = `${m[1]}:${m[2]}`;
      levels[key] = Math.max(levels[key] ?? 0, Number(m[3]));
      continue;
    }
    const g = /^(global|gacha|click|news|offline):(\d+)$/.exec(id);
    if (g) {
      const key = g[1] === "news" ? "newsFrequency" : g[1] === "offline" ? "offlineRate" : g[1];
      levels[key] = Math.max(levels[key] ?? 0, Number(g[2]));
    }
  }
  return levels;
}
