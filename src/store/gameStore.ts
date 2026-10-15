import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { BY_ID, INDEX_MEMBERS, POOL } from "../data/companies";
import { OFFLINE_MIN_SECONDS, SAVE_VERSION } from "../game/balance";
import { clickValue, offlineEarnings, totalIncome, type IncomeBreakdown } from "../game/economy";
import { INITIAL_GACHA, pullCost, rollPull } from "../game/gacha";
import { RARITY_RANK } from "../game/rarity";
import type { GachaState, Holdings, PullResult } from "../game/types";

export interface Stats {
  clicks: number;
  bestRarityRank: number; // -1 = ninguna tirada todavía
  playSeconds: number;
  startedAt: number;
}

export interface OfflineReport {
  seconds: number;
  earned: number;
}

export interface GameState {
  capital: number;
  totalEarned: number;
  holdings: Holdings;
  gacha: GachaState;
  lastTick: number;
  stats: Stats;
  /** Transitorio (no se guarda) */
  lastPull: PullResult | null;
  offline: OfflineReport | null;

  tick: (now?: number) => void;
  openPack: () => PullResult | null;
  work: () => void;
  dismissOffline: () => void;
  clearLastPull: () => void;
  reset: () => void;
}

function initialState(now = Date.now()) {
  return {
    capital: 0,
    totalEarned: 0,
    holdings: {} as Holdings,
    gacha: INITIAL_GACHA,
    lastTick: now,
    stats: { clicks: 0, bestRarityRank: -1, playSeconds: 0, startedAt: now },
    lastPull: null,
    offline: null,
  };
}

export function incomeOf(holdings: Holdings): IncomeBreakdown {
  return totalIncome(holdings, BY_ID, INDEX_MEMBERS);
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      tick: (now = Date.now()) => {
        const s = get();
        const dt = (now - s.lastTick) / 1000;
        if (dt <= 0) return;
        const income = incomeOf(s.holdings).total;
        if (dt >= OFFLINE_MIN_SECONDS) {
          // Ausencia: progreso offline con penalización y tope.
          const report = offlineEarnings(income, dt);
          set({
            capital: s.capital + report.earned,
            totalEarned: s.totalEarned + report.earned,
            lastTick: now,
            offline: report.earned > 0 ? report : null,
          });
          return;
        }
        const earned = income * dt;
        set({
          capital: s.capital + earned,
          totalEarned: s.totalEarned + earned,
          lastTick: now,
          stats: { ...s.stats, playSeconds: s.stats.playSeconds + dt },
        });
      },

      openPack: () => {
        const s = get();
        const cost = pullCost(s.gacha.pulls);
        if (s.capital < cost) return null;
        const roll = rollPull(POOL, s.gacha);
        const now = Date.now();
        const prev = s.holdings[roll.company.id];
        const shares = (prev?.shares ?? 0) + 1;
        const result: PullResult = {
          company: roll.company,
          rarity: roll.rarity,
          isNew: !prev,
          shares,
          pity: roll.pity,
        };
        set({
          capital: s.capital - cost,
          holdings: { ...s.holdings, [roll.company.id]: { shares, firstAt: prev?.firstAt ?? now } },
          gacha: roll.next,
          lastPull: result,
          stats: { ...s.stats, bestRarityRank: Math.max(s.stats.bestRarityRank, RARITY_RANK[roll.rarity]) },
        });
        return result;
      },

      work: () => {
        const s = get();
        const gain = clickValue(incomeOf(s.holdings).total);
        set({
          capital: s.capital + gain,
          totalEarned: s.totalEarned + gain,
          stats: { ...s.stats, clicks: s.stats.clicks + 1 },
        });
      },

      dismissOffline: () => set({ offline: null }),
      clearLastPull: () => set({ lastPull: null }),
      reset: () => set(initialState()),
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
      }),
      onRehydrateStorage: () => (state) => {
        // Al cargar una partida guardada, abonar el tiempo ausente.
        state?.tick(Date.now());
      },
    },
  ),
);

/** Ingresos actuales, memorizados por referencia de holdings. */
export function useIncome(): IncomeBreakdown {
  const holdings = useGame((s) => s.holdings);
  return useMemo(() => incomeOf(holdings), [holdings]);
}
