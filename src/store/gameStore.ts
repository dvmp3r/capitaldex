import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { BY_ID, INDEX_MEMBERS, POOL } from "../data/companies";
import { OFFLINE_MIN_SECONDS, SAVE_VERSION, SHARE_MILESTONES } from "../game/balance";
import { clickValue, offlineEarnings, totalIncome, type IncomeBreakdown } from "../game/economy";
import { INITIAL_GACHA, pullCost, rollPull } from "../game/gacha";
import { NEWS_OFFER_SEC, pickNews, scheduleNext, type NewsItem } from "../game/news";
import { RARITY_RANK, rarityOf } from "../game/rarity";
import { regionOf } from "../game/regions";
import { parseSave, serializeSave, type ParseResult } from "../game/save";
import type { ActiveBoost, GachaState, Holdings, PullResult, Rarity, SaveData, Stats } from "../game/types";
import { computeMultipliers, migrateLegacyUpgrades, requirementMet, seriesCost, seriesHeadline, SERIES_BY_ID, type Multipliers, type PlayerContext, type UpgradeLevels } from "../game/upgrades";

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
  /** Carteras gratis pendientes (regalos de noticias) */
  freePulls: number;
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
  work: () => void;
  buyUpgrade: (id: string) => boolean;
  acceptNews: () => void;
  dismissNews: () => void;
  dismissOffline: () => void;
  clearLastPull: () => void;
  reset: () => void;
  exportSave: () => string;
  importSave: (text: string) => ParseResult;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const DEFAULT_SETTINGS: Settings = { sound: true, reducedMotion: false, introSeen: false };

function initialState(now = Date.now()) {
  return {
    capital: 0,
    totalEarned: 0,
    holdings: {} as Holdings,
    gacha: INITIAL_GACHA,
    lastTick: now,
    stats: { clicks: 0, bestRarityRank: -1, playSeconds: 0, startedAt: now },
    upgrades: {} as UpgradeLevels,
    boosts: [] as ActiveBoost[],
    freePulls: 0,
    news: { offer: null as NewsOffer | null, nextAt: 0 },
    lastPull: null,
    offline: null,
    toasts: [] as Toast[],
  };
}

let toastSeq = 0;

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
export function multsOf(upgrades: UpgradeLevels, boosts: ActiveBoost[], now = Date.now()): Multipliers {
  return computeMultipliers(upgrades, boosts, now);
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
        const mults = multsOf(s.upgrades, s.boosts, now);
        const income = incomeOf(s.holdings, mults).total;

        if (dt >= OFFLINE_MIN_SECONDS) {
          // Ausencia: progreso offline con penalización y tope; las noticias se reprograman.
          const report = offlineEarnings(income, dt, mults.offlineRate, mults.offlineCapSeconds);
          set({
            capital: s.capital + report.earned,
            totalEarned: s.totalEarned + report.earned,
            lastTick: now,
            offline: report.earned > 0 ? report : null,
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
      },

      openPack: () => {
        const s = get();
        const mults = multsOf(s.upgrades, s.boosts);
        const free = s.freePulls > 0;
        const cost = free ? 0 : pullCost(s.gacha.pulls, mults.gachaCost);
        if (s.capital < cost) return null;
        const roll = rollPull(POOL, s.gacha);
        const now = Date.now();
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
          gacha: roll.next,
          freePulls: free ? s.freePulls - 1 : s.freePulls,
          lastPull: result,
          stats: { ...s.stats, bestRarityRank: Math.max(s.stats.bestRarityRank, RARITY_RANK[roll.rarity]) },
        });
        cloudHooks.onChange?.();
        return result;
      },

      work: () => {
        const s = get();
        const mults = multsOf(s.upgrades, s.boosts);
        const gain = clickValue(incomeOf(s.holdings, mults).total, mults.clickSeconds);
        set({ capital: s.capital + gain, totalEarned: s.totalEarned + gain, stats: { ...s.stats, clicks: s.stats.clicks + 1 } });
      },

      buyUpgrade: (id) => {
        const s = get();
        const series = SERIES_BY_ID.get(id);
        if (!series) return false;
        const level = (s.upgrades[id] ?? 0) + 1;
        if (level > series.maxLevel) return false;
        const cost = seriesCost(series, level);
        if (s.capital < cost) return false;
        if (!requirementMet(series.requirement(level), contextOf(s.holdings, s.gacha.pulls))) return false;
        const [headline] = seriesHeadline(series, level);
        set({
          capital: s.capital - cost,
          upgrades: { ...s.upgrades, [id]: level },
          toasts: [...s.toasts.slice(-3), { id: ++toastSeq, text: `${headline} · nivel ${level}`, kind: "gold" }],
        });
        cloudHooks.onChange?.();
        return true;
      },

      acceptNews: () => {
        const s = get();
        const offer = s.news.offer;
        if (!offer) return;
        const now = Date.now();
        const mults = multsOf(s.upgrades, s.boosts, now);
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
        set(patch);
      },

      dismissNews: () => {
        const s = get();
        if (!s.news.offer) return;
        set({ news: { offer: null, nextAt: scheduleNext(Date.now(), Math.random, multsOf(s.upgrades, s.boosts).newsFrequency) } });
      },

      dismissOffline: () => set({ offline: null }),
      clearLastPull: () => set({ lastPull: null }),
      reset: () => set(initialState()), // los ajustes se conservan

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
        };
        return serializeSave(data);
      },

      importSave: (text) => {
        const r = parseSave(text);
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
        news: s.news,
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
          news: p.news ?? { offer: null, nextAt: 0 },
        };
      },
      migrate: (persisted, version) => {
        // Punto único para migrar guardados antiguos cuando cambie SAVE_VERSION.
        const p = (persisted ?? {}) as Partial<GameState>;
        if (version < 2) return { ...p, upgrades: {}, boosts: [], freePulls: 0, news: { offer: null, nextAt: 0 } } as GameState;
        if (version < 3) return { ...p, upgrades: normalizeLevels(p.upgrades as unknown) } as GameState;
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
  return useMemo(() => multsOf(upgrades, boosts), [upgrades, boosts]);
}

/** Ingresos actuales, memorizados por referencia de holdings y multiplicadores. */
export function useIncome(): IncomeBreakdown {
  const holdings = useGame((s) => s.holdings);
  const mults = useMults();
  return useMemo(() => incomeOf(holdings, mults), [holdings, mults]);
}
