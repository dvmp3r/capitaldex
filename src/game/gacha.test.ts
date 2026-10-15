import { describe, expect, it } from "vitest";
import { FREE_PULLS, GACHA_ODDS, PITY_EPIC, PITY_LEGENDARY, PULL_BASE_COST, PULL_COST_GROWTH } from "./balance";
import { applyPity, INITIAL_GACHA, nextGachaState, pickCompany, pullCost, rollPull, weightedRarity } from "./gacha";
import { RARITIES, type Company, type Rarity } from "./types";

/** Generador determinista (mulberry32) para pruebas reproducibles. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fake(id: string, cap: number): Company {
  return { id, name: id, sector: "Tecnología", industry: "", country: "", countryCode: "US", exchange: "", currency: "USD",
    marketCapUsd: cap, revenueUsd: null, netIncomeUsd: null, dividendYield: null, pe: null, indices: [] };
}

const POOL: Record<Rarity, Company[]> = {
  comun: [fake("C1", 1e9), fake("C2", 2e9)],
  poco_comun: [fake("P1", 6e10)],
  rara: [fake("R1", 2e11)],
  epica: [fake("E1", 5e11)],
  legendaria: [fake("L1", 2e12)],
};

describe("coste de cartera", () => {
  it("las primeras son gratis y luego crece geométricamente", () => {
    for (let i = 0; i < FREE_PULLS; i++) expect(pullCost(i)).toBe(0);
    expect(pullCost(FREE_PULLS)).toBe(PULL_BASE_COST);
    expect(pullCost(FREE_PULLS + 1)).toBe(Math.round(PULL_BASE_COST * PULL_COST_GROWTH));
    expect(pullCost(FREE_PULLS + 10)).toBeGreaterThan(pullCost(FREE_PULLS + 9));
  });
});

describe("probabilidades", () => {
  it("suman 1", () => {
    const sum = RARITIES.reduce((s, r) => s + GACHA_ODDS[r], 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("el sorteo respeta las probabilidades en 200 000 tiradas (±1 punto)", () => {
    const rng = seeded(42);
    const n = 200_000;
    const counts = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>;
    for (let i = 0; i < n; i++) counts[weightedRarity(rng)]++;
    for (const r of RARITIES) expect(Math.abs(counts[r] / n - GACHA_ODDS[r])).toBeLessThan(0.01);
  });

  it("rng en los límites devuelve común y legendaria", () => {
    expect(weightedRarity(() => 0)).toBe("comun");
    expect(weightedRarity(() => 0.999999)).toBe("legendaria");
  });
});

describe("piedad", () => {
  it("no interviene antes de tiempo", () => {
    expect(applyPity("comun", { pulls: 5, sinceEpic: 5, sinceLegendary: 5 })).toEqual({ rarity: "comun", pity: false });
  });

  it("garantiza épica en la tirada PITY_EPIC", () => {
    const state = { pulls: 0, sinceEpic: PITY_EPIC - 1, sinceLegendary: 0 };
    expect(applyPity("comun", state)).toEqual({ rarity: "epica", pity: true });
    expect(applyPity("legendaria", state)).toEqual({ rarity: "legendaria", pity: false });
  });

  it("garantiza legendaria en la tirada PITY_LEGENDARY", () => {
    const state = { pulls: 0, sinceEpic: 0, sinceLegendary: PITY_LEGENDARY - 1 };
    expect(applyPity("rara", state)).toEqual({ rarity: "legendaria", pity: true });
  });

  it("los contadores se reinician con la rareza adecuada", () => {
    const s = nextGachaState({ pulls: 3, sinceEpic: 7, sinceLegendary: 20 }, "epica");
    expect(s).toEqual({ pulls: 4, sinceEpic: 0, sinceLegendary: 21 });
    expect(nextGachaState(s, "legendaria")).toEqual({ pulls: 5, sinceEpic: 0, sinceLegendary: 0 });
    expect(nextGachaState(s, "comun").sinceEpic).toBe(1);
  });

  it("en una secuencia larga nunca pasan más de PITY_EPIC tiradas sin épica", () => {
    const rng = seeded(7);
    let state = INITIAL_GACHA;
    let gap = 0;
    let maxGap = 0;
    for (let i = 0; i < 20_000; i++) {
      const r = rollPull(POOL, state, rng);
      state = r.next;
      if (r.rarity === "epica" || r.rarity === "legendaria") gap = 0;
      else maxGap = Math.max(maxGap, ++gap);
    }
    expect(maxGap).toBeLessThan(PITY_EPIC);
  });
});

describe("elección de empresa", () => {
  it("baja de rareza si el grupo está vacío", () => {
    const pool = { ...POOL, legendaria: [] as Company[] };
    expect(pickCompany(pool, "legendaria", () => 0).rarity).toBe("epica");
  });

  it("elige uniformemente dentro del grupo", () => {
    expect(pickCompany(POOL, "comun", () => 0).company.id).toBe("C1");
    expect(pickCompany(POOL, "comun", () => 0.99).company.id).toBe("C2");
  });
});
