import { describe, expect, it } from "vitest";
import { CLICK_MIN, CLICK_SECONDS, INCOME_COEF, INDEX_SETS, OFFLINE_CAP_SECONDS, OFFLINE_RATE } from "./balance";
import { baseIncome, clickValue, companyIncome, milestoneMult, nextMilestone, offlineEarnings, setProgress, setsMultiplier, totalIncome } from "./economy";
import type { Company } from "./types";

function fake(id: string, cap: number, indices: string[] = []): Company {
  return { id, name: id, sector: "Tecnología", industry: "", country: "", countryCode: "US", exchange: "", currency: "USD",
    marketCapUsd: cap, revenueUsd: null, netIncomeUsd: null, dividendYield: null, pe: null, indices };
}

describe("ingresos por empresa", () => {
  it("una empresa de 1 000 M produce el coeficiente base", () => {
    expect(baseIncome(fake("A", 1e9))).toBeCloseTo(INCOME_COEF, 10);
  });

  it("crece con la capitalización pero menos que linealmente", () => {
    const a = baseIncome(fake("A", 1e10));
    const b = baseIncome(fake("B", 1e11));
    expect(b).toBeGreaterThan(a);
    expect(b / a).toBeLessThan(10);
  });

  it("escala linealmente con las acciones hasta el primer hito", () => {
    const c = fake("A", 5e10);
    expect(companyIncome(c, 3)).toBeCloseTo(baseIncome(c) * 3, 10);
    expect(companyIncome(c, 0)).toBe(0);
  });

  it("los hitos se acumulan", () => {
    expect(milestoneMult(9)).toBe(1);
    expect(milestoneMult(10)).toBe(2);
    expect(milestoneMult(25)).toBe(4);
    expect(milestoneMult(50)).toBe(8);
    expect(milestoneMult(100)).toBe(24);
    expect(nextMilestone(0)?.shares).toBe(10);
    expect(nextMilestone(50)?.shares).toBe(100);
    expect(nextMilestone(100)).toBeNull();
  });
});

describe("sets", () => {
  const members = { DOW30: ["A", "B", "C", "D"] };

  it("sin empresas no hay bonus", () => {
    const sets = setProgress({}, members);
    const dow = sets.find((s) => s.id === "DOW30")!;
    expect(dow.owned).toBe(0);
    expect(dow.total).toBe(4);
    expect(dow.mult).toBe(1);
    expect(setsMultiplier(sets)).toBe(1);
  });

  it("el bonus parcial es cuadrático y el completo es el máximo", () => {
    const bonus = INDEX_SETS.find((s) => s.id === "DOW30")!.bonus;
    const half = setProgress({ A: { shares: 1, firstAt: 0 }, B: { shares: 2, firstAt: 0 } }, members).find((s) => s.id === "DOW30")!;
    expect(half.mult).toBeCloseTo(1 + bonus * 0.25, 10);
    const full = setProgress({ A: { shares: 1, firstAt: 0 }, B: { shares: 1, firstAt: 0 }, C: { shares: 1, firstAt: 0 }, D: { shares: 1, firstAt: 0 } }, members)
      .find((s) => s.id === "DOW30")!;
    expect(full.mult).toBeCloseTo(1 + bonus, 10);
  });

  it("los ingresos totales aplican el multiplicador de sets", () => {
    const byId = new Map([["A", fake("A", 1e11, ["DOW30"])], ["B", fake("B", 1e11, ["DOW30"])]]);
    const holdings = { A: { shares: 1, firstAt: 0 }, B: { shares: 1, firstAt: 0 } };
    const r = totalIncome(holdings, byId, { DOW30: ["A", "B"] });
    expect(r.perCompany).toBeCloseTo(baseIncome(byId.get("A")!) * 2, 10);
    expect(r.setsMult).toBeGreaterThan(1);
    expect(r.total).toBeCloseTo(r.perCompany * r.setsMult, 10);
  });
});

describe("clic y offline", () => {
  it("Operar tiene un mínimo y escala con los ingresos", () => {
    expect(clickValue(0)).toBe(CLICK_MIN);
    expect(clickValue(10)).toBe(10 * CLICK_SECONDS);
  });

  it("el progreso offline se penaliza y se acota", () => {
    expect(offlineEarnings(2, 100)).toEqual({ seconds: 100, earned: 2 * 100 * OFFLINE_RATE });
    const capped = offlineEarnings(2, OFFLINE_CAP_SECONDS * 5);
    expect(capped.seconds).toBe(OFFLINE_CAP_SECONDS);
    expect(offlineEarnings(2, -5).earned).toBe(0);
  });
});
