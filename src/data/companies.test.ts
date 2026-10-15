import { describe, expect, it } from "vitest";
import { INDEX_SETS, RARITY_THRESHOLDS_USD } from "../game/balance";
import { rarityOf } from "../game/rarity";
import { BY_ID, COMPANIES, COUNTRIES, countryName, INDEX_MEMBERS, POOL } from "./companies";

describe("datos de empresas", () => {
  it("hay un universo razonable sin duplicados", () => {
    expect(COMPANIES.length).toBeGreaterThan(300);
    expect(new Set(COMPANIES.map((c) => c.id)).size).toBe(COMPANIES.length);
    expect(BY_ID.size).toBe(COMPANIES.length);
  });

  it("todas tienen los campos mínimos", () => {
    for (const c of COMPANIES) {
      expect(c.id, c.id).toBeTruthy();
      expect(c.name, c.id).toBeTruthy();
      expect(c.sector, c.id).toBeTruthy();
      expect(c.countryCode, c.id).toMatch(/^[A-Z]{2}$/);
      expect(c.marketCapUsd, c.id).toBeGreaterThan(0);
      if (c.dividendYield != null) expect(c.dividendYield, c.id).toBeLessThan(0.3); // fracción, no porcentaje
    }
  });

  it("vienen ordenadas por capitalización descendente", () => {
    for (let i = 1; i < COMPANIES.length; i++) expect(COMPANIES[i - 1].marketCapUsd).toBeGreaterThanOrEqual(COMPANIES[i].marketCapUsd);
  });

  it("cada rareza tiene empresas y la legendaria es la más alta", () => {
    for (const group of Object.values(POOL)) expect(group.length).toBeGreaterThan(0);
    for (const c of POOL.legendaria) expect(c.marketCapUsd).toBeGreaterThanOrEqual(RARITY_THRESHOLDS_USD.legendaria);
    expect(rarityOf(COMPANIES[0])).toBe("legendaria");
  });

  it("los países tienen nombre en español y cubren todas las empresas", () => {
    expect(COUNTRIES.length).toBeGreaterThan(10);
    expect(COUNTRIES[0].code).toBe("US");
    expect(COUNTRIES.reduce((n, c) => n + c.count, 0)).toBe(COMPANIES.length);
    for (const c of COUNTRIES) expect(countryName(c.code), c.code).not.toBe(c.code);
    expect(COUNTRIES.find((c) => c.code === "UN")?.count ?? 0).toBeLessThan(15); // empresas sin país en Yahoo
  });

  it("los sets de índice tienen el tamaño esperado", () => {
    const expected: Record<string, number> = { DOW30: 30, IBEX35: 35, DAX40: 40, EUROSTOXX50: 50, UK_TOP: 20 };
    for (const set of INDEX_SETS) {
      const n = INDEX_MEMBERS[set.id]?.length ?? 0;
      expect(n, set.id).toBeGreaterThan(0);
      if (expected[set.id]) expect(n, set.id).toBe(expected[set.id]);
    }
    expect(INDEX_MEMBERS.NASDAQ100.length).toBeGreaterThanOrEqual(95);
  });
});
