import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, achievementsMult, newlyUnlocked, rewardLabel, type AchievementContext } from "./achievements";

const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({
  pulls: 0, companies: 0, totalEarned: 0, clicks: 0, newsTaken: 0, maxShares: 0, sectors: 0, countries: 0,
  setsCompleted: 0, upgradeLevels: 0, maxedSeries: 0, byRarity: { comun: 0, poco_comun: 0, rara: 0, epica: 0, legendaria: 0 },
  ...over,
});

describe("logros", () => {
  it("tienen ids únicos y ninguno se cumple con la partida vacía", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(newlyUnlocked(ctx(), [])).toEqual([]);
  });

  it("se desbloquean una sola vez y por umbrales", () => {
    const first = newlyUnlocked(ctx({ pulls: 1 }), []);
    expect(first.map((a) => a.id)).toEqual(["pull_1"]);
    expect(newlyUnlocked(ctx({ pulls: 1 }), ["pull_1"])).toEqual([]);
    expect(newlyUnlocked(ctx({ pulls: 100 }), ["pull_1"]).map((a) => a.id)).toEqual(["pull_10", "pull_100"]);
  });

  it("los logros globales se multiplican", () => {
    expect(achievementsMult([])).toBe(1);
    expect(achievementsMult(["set_1", "companies_200", "pull_1"])).toBeCloseTo(1.05 * 1.05, 10);
  });

  it("las recompensas se describen", () => {
    expect(rewardLabel({ kind: "freePulls", n: 3 })).toBe("3 carteras gratis");
    expect(rewardLabel({ kind: "global", mult: 1.1 })).toBe("Todo ×1.1");
  });
});
