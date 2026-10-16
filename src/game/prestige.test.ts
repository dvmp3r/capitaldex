import { describe, expect, it } from "vitest";
import { earnedForInfluence, HOLDING_UPGRADES, influenceFor, prestigeEffects } from "./prestige";

describe("prestigio", () => {
  it("la influencia crece con raíz del capital generado", () => {
    expect(influenceFor(0)).toBe(0);
    expect(influenceFor(3e5)).toBe(1);
    expect(influenceFor(1e7)).toBe(4);
    expect(influenceFor(1e10)).toBe(64);
    expect(influenceFor(earnedForInfluence(10))).toBeGreaterThanOrEqual(10);
  });

  it("los efectos del holding parten de neutro", () => {
    const e = prestigeEffects(0, {});
    expect(e.global).toBe(1);
    expect(e.oddsMult).toBe(1);
    expect(e.autoPullSeconds).toBe(0);
    expect(e.newsFrequency).toBe(1);
    expect(e.extraOrders).toBe(0);
    expect(prestigeEffects(10, { eye: 2 }).global).toBeCloseTo(1.2, 10);
    expect(prestigeEffects(0, { eye: 2 }).oddsMult).toBeCloseTo(1.12 * 1.12, 10);
  });

  it("las mejoras tienen costes crecientes y textos", () => {
    for (const u of HOLDING_UPGRADES) {
      for (let n = 2; n <= u.maxLevel; n++) expect(u.cost(n)).toBeGreaterThanOrEqual(u.cost(n - 1));
      expect(u.effect(1).length).toBeGreaterThan(0);
    }
  });
});
