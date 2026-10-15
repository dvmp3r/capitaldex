import { describe, expect, it } from "vitest";
import { NEWS, NEWS_MAX_GAP_SEC, NEWS_MIN_GAP_SEC, pickNews, scheduleNext } from "./news";

describe("noticias de última hora", () => {
  it("la siguiente llega dentro del intervalo y antes si hay más frecuencia", () => {
    const now = 10_000;
    expect(scheduleNext(now, () => 0)).toBe(now + NEWS_MIN_GAP_SEC * 1000);
    expect(scheduleNext(now, () => 0.999)).toBeLessThanOrEqual(now + NEWS_MAX_GAP_SEC * 1000);
    expect(scheduleNext(now, () => 0, 2)).toBe(now + (NEWS_MIN_GAP_SEC / 2) * 1000);
  });

  it("elige según los pesos y cubre todo el repertorio", () => {
    expect(pickNews(() => 0).id).toBe(NEWS[0].id);
    expect(pickNews(() => 0.999999).id).toBe(NEWS[NEWS.length - 1].id);
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(pickNews(Math.random).id);
    expect(seen.size).toBe(NEWS.length);
  });

  it("todas las noticias tienen titular y efecto coherente", () => {
    for (const n of NEWS) {
      expect(n.headline.length).toBeGreaterThan(10);
      if (n.kind === "boost") expect(n.durationSec).toBeGreaterThan(0);
      if (n.kind === "capital") expect(n.incomeSeconds).toBeGreaterThan(0);
    }
  });
});
