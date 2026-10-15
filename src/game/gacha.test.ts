import { describe, expect, it } from "vitest";
import { FREE_PULLS, GACHA_ODDS, PULL_BASE_COST, PULL_COST_GROWTH } from "./balance";
import { INITIAL_GACHA, nextGachaState, pickCompany, pullCost, rollPull, weightedRarity } from "./gacha";
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

describe("sin piedad", () => {
  it("los contadores de racha se reinician con la rareza adecuada", () => {
    const s = nextGachaState({ pulls: 3, sinceEpic: 7, sinceLegendary: 20 }, "epica");
    expect(s).toEqual({ pulls: 4, sinceEpic: 0, sinceLegendary: 21 });
    expect(nextGachaState(s, "legendaria")).toEqual({ pulls: 5, sinceEpic: 0, sinceLegendary: 0 });
  });

  it("una racha larga sin épica no fuerza nada: la probabilidad es pura", () => {
    let state = { ...INITIAL_GACHA, sinceEpic: 500, sinceLegendary: 5000 };
    const r = rollPull(POOL, state, () => 0); // rng 0 → común siempre
    expect(r.rarity).toBe("comun");
    expect(r.pity).toBe(false);
    state = r.next;
    expect(state.sinceEpic).toBe(501);
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
