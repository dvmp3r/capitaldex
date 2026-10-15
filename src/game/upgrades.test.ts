import { describe, expect, it } from "vitest";
import { CLICK_SECONDS, OFFLINE_RATE } from "./balance";
import { companyIncome, companyMultiplier } from "./economy";
import type { Company } from "./types";
import { baseMultipliers, computeMultipliers, effectLabel, requirementMet, requirementText, UPGRADE_BY_ID, UPGRADES, type PlayerContext } from "./upgrades";

const label = (r: string) => r;
const ctx = (over: Partial<PlayerContext> = {}): PlayerContext => ({
  companies: 0,
  pulls: 0,
  bySector: {},
  byRegion: { US: 0, EU: 0, ASIA: 0, LATAM: 0, OTHER: 0 },
  byRarity: { comun: 0, poco_comun: 0, rara: 0, epica: 0, legendaria: 0 },
  owned: new Set(),
  ...over,
});
const fake = (cap: number, sector = "Energía", country = "US"): Company => ({
  id: "X", name: "X", sector, industry: "", country: "", countryCode: country, exchange: "", currency: "USD",
  marketCapUsd: cap, revenueUsd: null, netIncomeUsd: null, dividendYield: null, pe: null, indices: [],
});

describe("titulares (mejoras)", () => {
  it("tienen ids únicos y cada serie sube de coste", () => {
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(UPGRADES.length);
    expect(UPGRADES.length).toBeGreaterThan(60);
    for (const u of UPGRADES) {
      const prev = u.requires?.upgrade && UPGRADE_BY_ID.get(u.requires.upgrade);
      if (prev) expect(u.cost, u.id).toBeGreaterThan(prev.cost);
    }
  });

  it("los requisitos se evalúan y se explican", () => {
    const u = UPGRADE_BY_ID.get("sector:Energía:1")!;
    expect(requirementMet(u.requires, ctx())).toBe(false);
    expect(requirementText(u.requires, ctx(), label)).toMatch(/3 empresas de Energía/);
    expect(requirementMet(u.requires, ctx({ bySector: { "Energía": 3 } }))).toBe(true);
    const u2 = UPGRADE_BY_ID.get("sector:Energía:2")!;
    expect(requirementMet(u2.requires, ctx({ bySector: { "Energía": 20 } }))).toBe(false); // falta el titular previo
    expect(requirementMet(u2.requires, ctx({ bySector: { "Energía": 20 }, owned: new Set(["sector:Energía:1"]) }))).toBe(true);
  });

  it("los multiplicadores se acumulan y los impulsos caducan", () => {
    const now = 1_000_000;
    const m = computeMultipliers(["sector:Energía:1", "sector:Energía:2", "global:1", "gacha:1", "click:1"], [
      { id: "n1", headline: "", effect: { kind: "sector", sector: "Energía", mult: 3 }, until: now + 1000 },
      { id: "n2", headline: "", effect: { kind: "global", mult: 2 }, until: now - 1 },
    ], now);
    expect(m.sector["Energía"]).toBe(12); // 2 × 2 × 3
    expect(m.global).toBe(2); // el impulso global ya caducó
    expect(m.gachaCost).toBeCloseTo(0.9, 10);
    expect(m.clickSeconds).toBe(CLICK_SECONDS + 10);
    expect(baseMultipliers().offlineRate).toBe(OFFLINE_RATE);
  });

  it("afectan a los ingresos de la empresa según sector, región y rareza", () => {
    const m = computeMultipliers(["sector:Energía:1", "region:US:1", "rarity:comun:1", "global:1"]);
    const c = fake(1e10); // común, Energía, EE. UU.
    expect(companyMultiplier(c, m)).toBe(16);
    expect(companyIncome(c, 1, m)).toBeCloseTo(companyIncome(c, 1) * 16, 10);
    expect(companyMultiplier(fake(1e10, "Salud", "ES"), m)).toBe(4); // solo rareza y global
  });

  it("describe los efectos en texto corto", () => {
    expect(effectLabel({ kind: "sector", sector: "Energía", mult: 2 }, label)).toBe("Energía ×2");
    expect(effectLabel({ kind: "gachaDiscount", pct: 10 }, label)).toBe("Carteras −10 %");
    expect(effectLabel({ kind: "offlineRate", set: 0.75 }, label)).toBe("Offline 75 %");
  });
});
