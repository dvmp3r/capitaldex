import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { BY_ID, INDEX_MEMBERS, POOL } from "../data/companies";
import { ORDERS_MAX, ORDERS_REFILL_SECONDS, OFFLINE_MIN_SECONDS, SAVE_VERSION, SHAKE_ODDS_BONUS, SHAKE_WINDOW_MS, SHARE_MILESTONES } from "../game/balance";
import { clickValue, offlineEarnings, totalIncome, type IncomeBreakdown } from "../game/economy";
import { ACHIEVEMENT_BY_ID, achievementsMult, newlyUnlocked, rewardLabel, type AchievementContext, type Reward } from "../game/achievements";
import { isMission, MISSION_COUNT, missionDone, newMission, type Mission } from "../game/missions";
import { contactsPulls, deskOrders, HOLDING_BY_ID, influenceFor, memoryLevels, prestigeEffects, seedCapital, type HoldingLevels, type HoldingUpgradeId } from "../game/prestige";
import { effectiveOdds, INITIAL_GACHA, pullCost, rollPull } from "../game/gacha";
import { NEWS_OFFER_SEC, pickNews, scheduleNext, type NewsItem } from "../game/news";
import { RARITY_RANK, rarityOf } from "../game/rarity";
import { regionOf } from "../game/regions";
import { parseSave, serializeSave, type ParseResult } from "../game/save";
import type { ActiveBoost, GachaState, Holdings, PullResult, Rarity, SaveData, Stats } from "../game/types";
import { computeMultipliers, migrateLegacyUpgrades, requirementMet, SERIES, seriesCost, seriesHeadline, SERIES_BY_ID, type Multipliers, type PlayerContext, type UpgradeLevels } from "../game/upgrades";
import { setProgress } from "../game/economy";

export type { Stats } from "../game/types";

export interface OfflineReport {
  seconds: number;
  earned: number;
}

export interface Settings {
  sound: boolean;
  reducedMotion: boolean;
  /** La introducción a toda pantalla ya se ha visto (o se ha saltado). */
  introSeen: boolean;
  /** Tutorial guiado de la primera partida ya visto o saltado */
  tutorialSeen: boolean;
}

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "gold" | "up";
}

export interface NewsOffer {
  item: NewsItem;
  expiresAt: number;
}

export interface GameState {
  capital: number;
  totalEarned: number;
  holdings: Holdings;
  gacha: GachaState;
  lastTick: number;
  stats: Stats;
  settings: Settings;
  /** Nivel comprado de cada serie de titulares */
  upgrades: UpgradeLevels;
  /** Impulsos temporales activos */
  boosts: ActiveBoost[];
  /** Carteras gratis pendientes (regalos de noticias y logros) */
  freePulls: number;
  /** Logros desbloqueados */
  achievements: string[];
  /** Contador de carteras abiertas en esta sesión (manuales y automáticas): relanza la animación. */
  pullSeq: number;
  /** Momento de la última cartera automática */
  lastAutoPull: number;
  /** Momento de la última orden automática de Operar */
  lastAutoWork: number;
  /** Órdenes de Operar disponibles (se recuperan con el tiempo) */
  orders: number;
  /** Objetivos de partida activos (3) y cuántos se han completado */
  missions: Mission[];
  missionsDone: number;
  /** Última sacudida fuerte de la máquina (bono de suerte para la siguiente cartera; no se guarda) */
  shakenAt: number;
  /** Colección permanente: empresa → momento en que salió por primera vez (sobrevive al holding) */
  discovered: Record<string, number>;
  /** Capital generado en partidas anteriores (el de esta es totalEarned) */
  lifetimeBase: number;
  /** Influencia disponible para gastar y total cobrada */
  influence: number;
  influenceEarned: number;
  /** Mejoras permanentes del holding */
  holding: HoldingLevels;
  holdingsFounded: number;
  runStartedAt: number;
  /** Pantalla del holding abierta */
  holdingOpen: boolean;
  /** Noticias: oferta en pantalla y momento de la siguiente */
  news: { offer: NewsOffer | null; nextAt: number };
  /** Transitorio (no se guarda) */
  lastPull: PullResult | null;
  offline: OfflineReport | null;
  toasts: Toast[];
  pushToast: (text: string, kind?: Toast["kind"]) => void;
  removeToast: (id: number) => void;

  tick: (now?: number) => void;
  openPack: () => PullResult | null;
  /** Gasta una orden; devuelve lo ganado (0 si no quedan). */
  work: () => number;
  /** Sube `count` niveles de una serie (los que se puedan pagar y estén desbloqueados). */
  buyUpgrade: (id: string, count?: number) => boolean;
  acceptNews: () => void;
  checkAchievements: () => void;
  /** La máquina se ha agitado con ganas: bono de suerte para la siguiente cartera. */
  noteShake: () => void;
  openHolding: (open: boolean) => void;
  /** Fundar el holding: cobra la influencia y empieza una partida nueva con las mejoras permanentes. */
  foundHolding: () => boolean;
  buyHolding: (id: HoldingUpgradeId) => boolean;
  dismissNews: () => void;
  dismissOffline: () => void;
  clearLastPull: () => void;
  reset: () => void;
  exportSave: () => string;
  /** `trusted`: partida de la nube del propio usuario (sin suma de control). */
  importSave: (text: string, trusted?: boolean) => ParseResult;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const DEFAULT_SETTINGS: Settings = { sound: true, reducedMotion: false, introSeen: false, tutorialSeen: false };

function initialState(now = Date.now()) {
  return {
    capital: 0,
    totalEarned: 0,
    holdings: {} as Holdings,
    gacha: INITIAL_GACHA,
    lastTick: now,
    stats: { clicks: 0, bestRarityRank: -1, playSeconds: 0, startedAt: now, newsTaken: 0 },
    upgrades: {} as UpgradeLevels,
    boosts: [] as ActiveBoost[],
    freePulls: 0,
    achievements: [] as string[],
    pullSeq: 0,
    lastAutoPull: 0,
    lastAutoWork: 0,
    orders: ORDERS_MAX,
    missions: [] as Mission[],
    missionsDone: 0,
    shakenAt: 0,
    discovered: {} as Record<string, number>,
    lifetimeBase: 0,
    influence: 0,
    influenceEarned: 0,
    holding: {} as HoldingLevels,
    holdingsFounded: 0,
    runStartedAt: now,
    holdingOpen: false,
    news: { offer: null as NewsOffer | null, nextAt: 0 },
    lastPull: null,
    offline: null,
    toasts: [] as Toast[],
  };
}

let toastSeq = 0;

/** Colección descubierta: la guardada o, si falta (guardados antiguos), las empresas en cartera. */
function discoveredFrom(saved: unknown, holdings: Holdings): Record<string, number> {
  const out: Record<string, number> = {};
  if (saved && typeof saved === "object") {
    for (const [id, at] of Object.entries(saved as Record<string, unknown>)) if (BY_ID.has(id) && typeof at === "number") out[id] = at;
  }
  for (const [id, h] of Object.entries(holdings)) if (!out[id] && BY_ID.has(id)) out[id] = h.firstAt;
  return out;
}

function normalizeHolding(raw: unknown): HoldingLevels {
  const out: HoldingLevels = {};
  if (raw && typeof raw === "object") {
    for (const [id, lvl] of Object.entries(raw as Record<string, unknown>)) {
      const u = HOLDING_BY_ID.get(id as HoldingUpgradeId);
      if (u && typeof lvl === "number" && lvl > 0) out[id as HoldingUpgradeId] = Math.min(u.maxLevel, Math.floor(lvl));
    }
  }
  return out;
}

/** Acepta el formato antiguo (lista de ids) o el nuevo (niveles por serie) y devuelve niveles válidos. */
export function normalizeLevels(raw: unknown): UpgradeLevels {
  if (Array.isArray(raw)) return migrateLegacyUpgrades(raw.filter((x) => typeof x === "string"));
  const out: UpgradeLevels = {};
  if (raw && typeof raw === "object") {
    for (const [id, lvl] of Object.entries(raw as Record<string, unknown>)) {
      const s = SERIES_BY_ID.get(id);
      if (s && typeof lvl === "number" && lvl > 0) out[id] = Math.min(s.maxLevel, Math.floor(lvl));
    }
  }
  return out;
}

/** Multiplicadores vigentes de una partida. */
export function multsOf(upgrades: UpgradeLevels, boosts: ActiveBoost[], now = Date.now(), achievements: string[] = [], influenceEarned = 0, holding: HoldingLevels = {}): Multipliers {
  const pe = prestigeEffects(influenceEarned, holding);
  const m = computeMultipliers(upgrades, boosts, now, achievementsMult(achievements) * pe.global);
  m.oddsMult *= pe.oddsMult;
  if (pe.autoPullSeconds > 0 && (m.autoPullSeconds === 0 || pe.autoPullSeconds < m.autoPullSeconds)) m.autoPullSeconds = pe.autoPullSeconds;
  m.newsFrequency *= pe.newsFrequency;
  return m;
}

/** Órdenes máximas de Operar, con la mesa ampliada del holding. */
export function ordersMaxOf(holding: HoldingLevels): number {
  return ORDERS_MAX + deskOrders(holding.desk ?? 0);
}

export function incomeOf(holdings: Holdings, mults: Multipliers): IncomeBreakdown {
  return totalIncome(holdings, BY_ID, INDEX_MEMBERS, mults);
}

/** Contexto para los requisitos de las mejoras. */
export function contextOf(holdings: Holdings, pulls: number): PlayerContext {
  const bySector: Record<string, number> = {};
  const byRegion = { US: 0, EU: 0, ASIA: 0, LATAM: 0, OTHER: 0 };
  const byRarity: Record<Rarity, number> = { comun: 0, poco_comun: 0, rara: 0, epica: 0, legendaria: 0 };
  let companies = 0;
  for (const id of Object.keys(holdings)) {
    const c = BY_ID.get(id);
    if (!c) continue;
    companies++;
    bySector[c.sector] = (bySector[c.sector] ?? 0) + 1;
    byRegion[regionOf(c.countryCode)]++;
    byRarity[rarityOf(c)]++;
  }
  return { companies, pulls, bySector, byRegion, byRarity };
}

/** Avisa a la nube (si hay sesión) poco después de un cambio importante; se registra desde cloudStore. */
export const cloudHooks: { onChange?: () => void } = {};

/** Resumen de la partida para evaluar logros. */
export function achievementContextOf(s: Pick<GameState, "holdings" | "gacha" | "totalEarned" | "stats" | "upgrades">): AchievementContext {
  const base = contextOf(s.holdings, s.gacha.pulls);
  let maxShares = 0;
  const countries = new Set<string>();
  for (const [id, h] of Object.entries(s.holdings)) {
    maxShares = Math.max(maxShares, h.shares);
    const c = BY_ID.get(id);
    if (c) countries.add(c.countryCode);
  }
  return {
    pulls: s.gacha.pulls,
    companies: base.companies,
    totalEarned: s.totalEarned,
    clicks: s.stats.clicks,
    newsTaken: s.stats.newsTaken ?? 0,
    maxShares,
    sectors: Object.keys(base.bySector).length,
    countries: countries.size,
    setsCompleted: setProgress(s.holdings, INDEX_MEMBERS).filter((p) => p.total > 0 && p.owned === p.total).length,
    upgradeLevels: Object.values(s.upgrades).reduce((n, l) => n + l, 0),
    maxedSeries: SERIES.filter((sr) => (s.upgrades[sr.id] ?? 0) >= sr.maxLevel).length,
    byRarity: base.byRarity,
    bySector: base.bySector,
  };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      settings: DEFAULT_SETTINGS,

      setSetting: (key, value) => set({ settings: { ...get().settings, [key]: value } }),
      pushToast: (text, kind = "info") => set({ toasts: [...get().toasts.slice(-3), { id: ++toastSeq, text, kind }] }),
      removeToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

      tick: (now = Date.now()) => {
        const s = get();
        const dt = (now - s.lastTick) / 1000;
        if (dt <= 0) return;
        const mults = multsOf(s.upgrades, s.boosts, now, s.achievements, s.influenceEarned, s.holding);
        const income = incomeOf(s.holdings, mults).total;

        if (dt >= OFFLINE_MIN_SECONDS) {
          // Ausencia: progreso offline con penalización y tope; las noticias se reprograman.
          const report = offlineEarnings(income, dt, mults.offlineRate, mults.offlineCapSeconds);
          set({
            capital: s.capital + report.earned,
            totalEarned: s.totalEarned + report.earned,
            lastTick: now,
            offline: report.earned > 0 ? report : null,
            orders: ordersMaxOf(s.holding),
            boosts: s.boosts.filter((b) => b.until > now),
            news: { offer: null, nextAt: scheduleNext(now, Math.random, mults.newsFrequency) },
          });
          return;
        }

        const earned = income * dt;
        const patch: Partial<GameState> = {
          capital: s.capital + earned,
          totalEarned: s.totalEarned + earned,
          lastTick: now,
          orders: Math.min(ordersMaxOf(s.holding), s.orders + dt / ORDERS_REFILL_SECONDS),
          stats: { ...s.stats, playSeconds: s.stats.playSeconds + dt },
        };
        if (s.boosts.some((b) => b.until <= now)) patch.boosts = s.boosts.filter((b) => b.until > now);

        // Noticias de última hora
        const news = s.news;
        if (news.offer && now > news.offer.expiresAt) {
          patch.news = { offer: null, nextAt: scheduleNext(now, Math.random, mults.newsFrequency) };
        } else if (!news.offer && (news.nextAt === 0 || now >= news.nextAt)) {
          if (news.nextAt === 0) patch.news = { offer: null, nextAt: scheduleNext(now, Math.random, mults.newsFrequency) };
          else patch.news = { offer: { item: pickNews(Math.random), expiresAt: now + NEWS_OFFER_SEC * 1000 }, nextAt: 0 };
        }
        set(patch);
        if (Math.floor(now / 5000) !== Math.floor(s.lastTick / 5000)) get().checkAchievements();
        // Operador automático: gasta una orden sola cada cierto tiempo.
        if (mults.autoWorkSeconds > 0 && now - s.lastAutoWork >= mults.autoWorkSeconds * 1000 && get().orders >= 1) {
          set({ lastAutoWork: now });
          get().work();
        }
        // Gestor automático: abre una cartera sola cada cierto tiempo, si hay capital.
        if (mults.autoPullSeconds > 0 && now - s.lastAutoPull >= mults.autoPullSeconds * 1000) {
          set({ lastAutoPull: now });
          const cost = get().freePulls > 0 ? 0 : pullCost(get().gacha.pulls, mults.gachaCost);
          if (get().capital >= cost) get().openPack();
        }
      },

      openPack: () => {
        const s = get();
        const mults = multsOf(s.upgrades, s.boosts, Date.now(), s.achievements, s.influenceEarned, s.holding);
        const free = s.freePulls > 0;
        const cost = free ? 0 : pullCost(s.gacha.pulls, mults.gachaCost);
        if (s.capital < cost) return null;
        const now = Date.now();
        const shaken = now - s.shakenAt < SHAKE_WINDOW_MS;
        const roll = rollPull(POOL, s.gacha, Math.random, effectiveOdds(mults.oddsMult * (shaken ? SHAKE_ODDS_BONUS : 1)));
        const prev = s.holdings[roll.company.id];
        const shares = (prev?.shares ?? 0) + 1;
        const result: PullResult = { company: roll.company, rarity: roll.rarity, isNew: !prev, shares, pity: roll.pity };
        const milestone = SHARE_MILESTONES.find((m) => m.shares === shares);
        const toasts = [...s.toasts.slice(-3)];
        if (milestone) toasts.push({ id: ++toastSeq, text: `Hito: ${shares} acciones de ${roll.company.id.replace(/\.[A-Z]+$/, "")} → ×${milestone.mult}`, kind: "gold" });
        set({
          toasts,
          capital: s.capital - cost,
          holdings: { ...s.holdings, [roll.company.id]: { shares, firstAt: prev?.firstAt ?? now } },
          discovered: s.discovered[roll.company.id] ? s.discovered : { ...s.discovered, [roll.company.id]: now },
          gacha: roll.next,
          shakenAt: 0,
          freePulls: free ? s.freePulls - 1 : s.freePulls,
          lastPull: result,
          pullSeq: s.pullSeq + 1,
          stats: { ...s.stats, bestRarityRank: Math.max(s.stats.bestRarityRank, RARITY_RANK[roll.rarity]) },
        });
        cloudHooks.onChange?.();
        get().checkAchievements();
        return result;
      },

      work: () => {
        const s = get();
        if (s.orders < 1) return 0;
        const mults = multsOf(s.upgrades, s.boosts, Date.now(), s.achievements, s.influenceEarned, s.holding);
        const gain = clickValue(incomeOf(s.holdings, mults).total, mults.clickSeconds);
        set({ capital: s.capital + gain, totalEarned: s.totalEarned + gain, orders: s.orders - 1, stats: { ...s.stats, clicks: s.stats.clicks + 1 } });
        if (s.stats.clicks % 25 === 24) get().checkAchievements();
        return gain;
      },

      buyUpgrade: (id, count = 1) => {
        const s = get();
        const series = SERIES_BY_ID.get(id);
        if (!series) return false;
        const ctx = contextOf(s.holdings, s.gacha.pulls);
        let level = s.upgrades[id] ?? 0;
        let capital = s.capital;
        let bought = 0;
        while (bought < count && level < series.maxLevel) {
          const next = level + 1;
          const cost = seriesCost(series, next);
          if (capital < cost || !requirementMet(series.requirement(next), ctx)) break;
          capital -= cost;
          level = next;
          bought++;
        }
        if (bought === 0) return false;
        const [headline] = seriesHeadline(series, level);
        set({
          capital,
          upgrades: { ...s.upgrades, [id]: level },
          toasts: [...s.toasts.slice(-3), { id: ++toastSeq, text: bought > 1 ? `${headline} · nivel ${level} (+${bought})` : `${headline} · nivel ${level}`, kind: "gold" }],
        });
        cloudHooks.onChange?.();
        get().checkAchievements();
        return true;
      },

      acceptNews: () => {
        const s = get();
        const offer = s.news.offer;
        if (!offer) return;
        const now = Date.now();
        const mults = multsOf(s.upgrades, s.boosts, now, s.achievements, s.influenceEarned, s.holding);
        const item = offer.item;
        const patch: Partial<GameState> = { news: { offer: null, nextAt: scheduleNext(now, Math.random, mults.newsFrequency) } };
        if (item.kind === "boost") {
          const boost: ActiveBoost = { id: item.id, headline: item.headline, effect: item.effect, until: now + item.durationSec * mults.newsDuration * 1000 };
          patch.boosts = [...s.boosts.filter((b) => b.id !== item.id && b.until > now), boost];
        } else if (item.kind === "capital") {
          const gain = Math.max(50, incomeOf(s.holdings, mults).total * item.incomeSeconds);
          patch.capital = s.capital + gain;
          patch.totalEarned = s.totalEarned + gain;
        } else if (item.kind === "freePull") {
          patch.freePulls = s.freePulls + 1;
        }
        patch.toasts = [...s.toasts.slice(-3), { id: ++toastSeq, text: item.headline, kind: "up" }];
        patch.stats = { ...s.stats, newsTaken: (s.stats.newsTaken ?? 0) + 1 };
        set(patch);
        get().checkAchievements();
      },

      dismissNews: () => {
        const s = get();
        if (!s.news.offer) return;
        set({ news: { offer: null, nextAt: scheduleNext(Date.now(), Math.random, multsOf(s.upgrades, s.boosts, Date.now(), s.achievements, s.influenceEarned, s.holding).newsFrequency) } });
      },

      checkAchievements: () => {
        const s = get();
        const ctx = achievementContextOf(s);
        const fresh = newlyUnlocked(ctx, s.achievements);
        const doneMissions = s.missions.filter((m) => missionDone(m, ctx));
        const needMissions = s.missions.length < MISSION_COUNT || doneMissions.length > 0;
        if (!fresh.length && !needMissions) return;
        const mults = multsOf(s.upgrades, s.boosts, Date.now(), s.achievements, s.influenceEarned, s.holding);
        const income = incomeOf(s.holdings, mults).total;
        let capital = s.capital;
        let totalEarned = s.totalEarned;
        let freePulls = s.freePulls;
        const toasts = [...s.toasts.slice(-2)];
        const pay = (reward: Reward) => {
          if (reward.kind === "capital") {
            const gain = Math.max(100, income * reward.minutes * 60);
            capital += gain;
            totalEarned += gain;
          } else if (reward.kind === "freePulls") freePulls += reward.n;
        };
        for (const a of fresh) {
          pay(a.reward);
          toasts.push({ id: ++toastSeq, text: `Logro: ${a.title} · ${rewardLabel(a.reward)}`, kind: "gold" });
        }
        // Objetivos cumplidos: se cobran y se sustituyen; si faltan, se completan hasta tres.
        let missions = s.missions.filter((m) => !doneMissions.includes(m));
        let missionsDone = s.missionsDone;
        for (const m of doneMissions) {
          pay(m.reward);
          missionsDone++;
          toasts.push({ id: ++toastSeq, text: `Objetivo: ${m.title} · ${rewardLabel(m.reward)}`, kind: "gold" });
        }
        let seq = missionsDone * 10 + missions.length;
        while (missions.length < MISSION_COUNT) {
          missions = [...missions, newMission(ctx, income, Math.random, missions.map((m) => m.kind), seq++)];
        }
        set({ capital, totalEarned, freePulls, toasts: toasts.slice(-4), achievements: [...s.achievements, ...fresh.map((a) => a.id)], missions, missionsDone });
        cloudHooks.onChange?.();
      },

      noteShake: () => set({ shakenAt: Date.now() }),

      openHolding: (open) => set({ holdingOpen: open }),

      foundHolding: () => {
        const s = get();
        const gain = influenceFor(s.lifetimeBase + s.totalEarned) - s.influenceEarned;
        if (gain < 1) return false;
        const now = Date.now();
        const keep = memoryLevels(s.holding.memory ?? 0);
        const upgrades: UpgradeLevels = {};
        for (const [id, lvl] of Object.entries(s.upgrades)) if (Math.min(lvl, keep) > 0) upgrades[id] = Math.min(lvl, keep);
        const founded = s.holdingsFounded + 1;
        set({
          ...initialState(now),
          settings: s.settings,
          discovered: s.discovered,
          achievements: s.achievements,
          stats: { ...s.stats, bestRarityRank: s.stats.bestRarityRank },
          lifetimeBase: s.lifetimeBase + s.totalEarned,
          influence: s.influence + gain,
          influenceEarned: s.influenceEarned + gain,
          holding: s.holding,
          holdingsFounded: founded,
          runStartedAt: now,
          capital: seedCapital(s.holding.seed ?? 0),
          freePulls: contactsPulls(s.holding.contacts ?? 0),
          upgrades,
          orders: ordersMaxOf(s.holding),
          holdingOpen: false,
          toasts: [{ id: ++toastSeq, text: `Holding nº ${founded} fundado · +${gain} de influencia`, kind: "gold" }],
        });
        cloudHooks.onChange?.();
        return true;
      },

      buyHolding: (id) => {
        const s = get();
        const u = HOLDING_BY_ID.get(id);
        if (!u) return false;
        const level = (s.holding[id] ?? 0) + 1;
        if (level > u.maxLevel) return false;
        const cost = u.cost(level);
        if (s.influence < cost) return false;
        set({ influence: s.influence - cost, holding: { ...s.holding, [id]: level } });
        cloudHooks.onChange?.();
        return true;
      },

      dismissOffline: () => set({ offline: null }),
      clearLastPull: () => set({ lastPull: null }),
      // Los ajustes se conservan, salvo que la introducción vuelve a mostrarse.
      reset: () => set({ ...initialState(), settings: { ...get().settings, introSeen: false } }),

      exportSave: () => {
        const s = get();
        const data: SaveData = {
          version: SAVE_VERSION,
          savedAt: Date.now(),
          capital: s.capital,
          totalEarned: s.totalEarned,
          holdings: s.holdings,
          gacha: s.gacha,
          lastTick: s.lastTick,
          stats: s.stats,
          upgrades: s.upgrades,
          boosts: s.boosts,
          freePulls: s.freePulls,
          orders: s.orders,
          achievements: s.achievements,
          missions: s.missions,
          missionsDone: s.missionsDone,
          discovered: s.discovered,
          lifetimeBase: s.lifetimeBase,
          influence: s.influence,
          influenceEarned: s.influenceEarned,
          holding: s.holding,
          holdingsFounded: s.holdingsFounded,
          runStartedAt: s.runStartedAt,
        };
        return serializeSave(data);
      },

      importSave: (text, trusted = false) => {
        const r = parseSave(text, trusted);
        if (!r.ok) return r;
        // Empresas que ya no existen en el universo se descartan sin romper la partida.
        const holdings: Holdings = {};
        for (const [id, h] of Object.entries(r.data.holdings)) if (BY_ID.has(id)) holdings[id] = h;
        set({
          capital: r.data.capital,
          totalEarned: r.data.totalEarned,
          holdings,
          gacha: r.data.gacha,
          lastTick: r.data.lastTick,
          stats: r.data.stats,
          upgrades: normalizeLevels(r.data.upgrades),
          boosts: r.data.boosts ?? [],
          freePulls: r.data.freePulls ?? 0,
          orders: Math.min(ORDERS_MAX, r.data.orders ?? ORDERS_MAX),
          missions: (r.data.missions ?? []).filter(isMission),
          missionsDone: r.data.missionsDone ?? 0,
          discovered: discoveredFrom(r.data.discovered, holdings),
          lifetimeBase: r.data.lifetimeBase ?? 0,
          influence: r.data.influence ?? 0,
          influenceEarned: r.data.influenceEarned ?? 0,
          holding: normalizeHolding(r.data.holding),
          holdingsFounded: r.data.holdingsFounded ?? 0,
          runStartedAt: r.data.runStartedAt ?? r.data.stats.startedAt,
          achievements: (r.data.achievements ?? []).filter((id) => ACHIEVEMENT_BY_ID.has(id)),
          news: { offer: null, nextAt: 0 },
          lastPull: null,
          offline: null,
        });
        get().tick(Date.now()); // abona el tiempo transcurrido desde que se exportó
        return r;
      },
    }),
    {
      name: "capitaldex-save",
      version: SAVE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        capital: s.capital,
        totalEarned: s.totalEarned,
        holdings: s.holdings,
        gacha: s.gacha,
        lastTick: s.lastTick,
        stats: s.stats,
        settings: s.settings,
        upgrades: s.upgrades,
        boosts: s.boosts,
        freePulls: s.freePulls,
        orders: s.orders,
        missions: s.missions,
        missionsDone: s.missionsDone,
        achievements: s.achievements,
        news: s.news,
        discovered: s.discovered,
        lifetimeBase: s.lifetimeBase,
        influence: s.influence,
        influenceEarned: s.influenceEarned,
        holding: s.holding,
        holdingsFounded: s.holdingsFounded,
        runStartedAt: s.runStartedAt,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameState>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          upgrades: normalizeLevels(p.upgrades as unknown),
          boosts: p.boosts ?? [],
          freePulls: p.freePulls ?? 0,
          achievements: p.achievements ?? [],
          orders: Math.min(ORDERS_MAX, p.orders ?? ORDERS_MAX),
          missions: Array.isArray(p.missions) ? p.missions.filter(isMission) : [],
          missionsDone: p.missionsDone ?? 0,
          news: p.news ?? { offer: null, nextAt: 0 },
          discovered: discoveredFrom(p.discovered, p.holdings ?? {}),
          lifetimeBase: p.lifetimeBase ?? 0,
          influence: p.influence ?? 0,
          influenceEarned: p.influenceEarned ?? 0,
          holding: normalizeHolding(p.holding),
          holdingsFounded: p.holdingsFounded ?? 0,
          runStartedAt: p.runStartedAt ?? p.stats?.startedAt ?? Date.now(),
          holdingOpen: false,
        };
      },
      migrate: (persisted, version) => {
        // Punto único para migrar guardados antiguos cuando cambie SAVE_VERSION.
        const p = (persisted ?? {}) as Partial<GameState>;
        if (version < 2) return { ...p, upgrades: {}, boosts: [], freePulls: 0, news: { offer: null, nextAt: 0 } } as GameState;
        if (version < 3) return { ...p, upgrades: normalizeLevels(p.upgrades as unknown), achievements: [] } as GameState;
        if (version < 4) return { ...p, achievements: [] } as GameState;
        if (version < 5) return { ...p, discovered: discoveredFrom(undefined, p.holdings ?? {}), lifetimeBase: 0, influence: 0, influenceEarned: 0, holding: {}, holdingsFounded: 0 } as GameState;
        return p as GameState;
      },
      onRehydrateStorage: () => (state) => {
        // Al cargar una partida guardada, abonar el tiempo ausente.
        state?.tick(Date.now());
      },
    },
  ),
);

/** Multiplicadores vigentes, memorizados por mejoras e impulsos. */
export function useMults(): Multipliers {
  const upgrades = useGame((s) => s.upgrades);
  const boosts = useGame((s) => s.boosts);
  const achievements = useGame((s) => s.achievements);
  const influenceEarned = useGame((s) => s.influenceEarned);
  const holding = useGame((s) => s.holding);
  return useMemo(() => multsOf(upgrades, boosts, Date.now(), achievements, influenceEarned, holding), [upgrades, boosts, achievements, influenceEarned, holding]);
}

/** Ingresos actuales, memorizados por referencia de holdings y multiplicadores. */
export function useIncome(): IncomeBreakdown {
  const holdings = useGame((s) => s.holdings);
  const mults = useMults();
  return useMemo(() => incomeOf(holdings, mults), [holdings, mults]);
}
