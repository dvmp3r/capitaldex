import { describe, expect, it } from "vitest";
import { CLICK_SECONDS, OFFLINE_RATE } from "./balance";
import { companyIncome, companyMultiplier } from "./economy";
import type { Company } from "./types";
import { baseMultipliers, computeMultipliers, cumulativeMult, effectLabel, levelBonus, migrateLegacyUpgrades, requirementMet, requirementText, SERIES, SERIES_BY_ID, seriesCost, seriesHeadline, seriesValue, type PlayerContext } from "./upgrades";

const label = (r: string) => r;
const ctx = (over: Partial<PlayerContext> = {}): PlayerContext => ({
  companies: 0,
  pulls: 0,
  bySector: {},
  byRegion: { US: 0, EU: 0, ASIA: 0, LATAM: 0, OTHER: 0 },
  byRarity: { comun: 0, poco_comun: 0, rara: 0, epica: 0, legendaria: 0 },
  ...over,
});
const fake = (cap: number, sector = "Energía", country = "US"): Company => ({
  id: "X", name: "X", sector, industry: "", country: "", countryCode: country, exchange: "", currency: "USD",
  marketCapUsd: cap, revenueUsd: null, netIncomeUsd: null, dividendYield: null, pe: null, indices: [],
});

describe("series de titulares por niveles", () => {
  it("la mejora de cada nivel es pequeña al principio y crece", () => {
    expect(levelBonus(1)).toBeCloseTo(0.05, 10);
    expect(levelBonus(2)).toBeGreaterThan(levelBonus(1));
    expect(levelBonus(25)).toBeGreaterThan(0.4);
    expect(cumulativeMult(1)).toBeCloseTo(1.05, 10);
    expect(cumulativeMult(25)).toBeGreaterThan(50);
    expect(cumulativeMult(25)).toBeLessThan(200);
  });

  it("el coste sube cada nivel y los titulares cambian por tramos", () => {
    const s = SERIES_BY_ID.get("sector:Energía")!;
    expect(seriesCost(s, 2)).toBeGreaterThan(seriesCost(s, 1));
    expect(seriesCost(s, 25)).toBeGreaterThan(seriesCost(s, 1) * 1000);
    expect(seriesHeadline(s, 0)[0]).toBe(s.headlines[0][0]);
    expect(seriesHeadline(s, 12)[0]).toBe(s.headlines[1][0]);
    expect(seriesHeadline(s, 24)[0]).toBe(s.headlines[2][0]);
    expect(new Set(SERIES.map((x) => x.id)).size).toBe(SERIES.length);
  });

  it("los requisitos crecen con el nivel y se explican", () => {
    const s = SERIES_BY_ID.get("sector:Energía")!;
    expect(requirementMet(s.requirement(1), ctx())).toBe(false);
    expect(requirementText(s.requirement(1), ctx(), label)).toMatch(/3 empresas de Energía/);
    expect(requirementMet(s.requirement(1), ctx({ bySector: { "Energía": 3 } }))).toBe(true);
    expect(requirementMet(s.requirement(10), ctx({ bySector: { "Energía": 3 } }))).toBe(false);
  });

  it("los multiplicadores se acumulan y los impulsos caducan", () => {
    const now = 1_000_000;
    const m = computeMultipliers({ "sector:Energía": 3, global: 2, gacha: 1, click: 1 }, [
      { id: "n1", headline: "", effect: { kind: "sector", sector: "Energía", mult: 3 }, until: now + 1000 },
      { id: "n2", headline: "", effect: { kind: "global", mult: 2 }, until: now - 1 },
    ], now);
    expect(m.sector["Energía"]).toBeCloseTo(cumulativeMult(3) * 3, 10);
    expect(m.global).toBeCloseTo(cumulativeMult(2), 10);
    expect(m.gachaCost).toBeCloseTo(0.98, 10);
    expect(m.clickSeconds).toBeCloseTo(CLICK_SECONDS + 0.5, 10);
    expect(baseMultipliers().offlineRate).toBe(OFFLINE_RATE);
    expect(seriesValue(SERIES_BY_ID.get("offlineRate")!, 10)).toBe(1);
    expect(seriesValue(SERIES_BY_ID.get("offlineCap")!, 10)).toBeCloseTo(24, 5);
  });

  it("afectan a los ingresos según sector, región y rareza", () => {
    const m = computeMultipliers({ "sector:Energía": 1, "region:US": 1, "rarity:comun": 1, global: 1 });
    const c = fake(1e10); // común, Energía, EE. UU.
    expect(companyMultiplier(c, m)).toBeCloseTo(1.05 ** 4, 10);
    expect(companyIncome(c, 1, m)).toBeCloseTo(companyIncome(c, 1) * 1.05 ** 4, 10);
    expect(companyMultiplier(fake(1e10, "Salud", "ES"), m)).toBeCloseTo(1.05 ** 2, 10);
  });

  it("migra los ids antiguos a niveles", () => {
    expect(migrateLegacyUpgrades(["sector:Energía:1", "sector:Energía:2", "global:1", "news:1", "offline:2"])).toEqual({
      "sector:Energía": 2, global: 1, newsFrequency: 1, offlineRate: 2,
    });
  });

  it("describe los efectos de las noticias en texto corto", () => {
    expect(effectLabel({ kind: "sector", sector: "Energía", mult: 3 }, label)).toBe("Energía ×3");
    expect(effectLabel({ kind: "global", mult: 2 }, label)).toBe("Todo ×2");
  });
});
