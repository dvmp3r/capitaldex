import { describe, expect, it } from "vitest";
import { SAVE_VERSION } from "./balance";
import { parseSave, saveFilename, serializeSave } from "./save";
import type { SaveData } from "./types";

const sample: SaveData = {
  version: SAVE_VERSION,
  savedAt: 1_760_000_000_000,
  capital: 1234.5,
  totalEarned: 9999,
  holdings: { AAPL: { shares: 3, firstAt: 1_759_000_000_000 }, "ITX.MC": { shares: 1, firstAt: 1_759_500_000_000 } },
  gacha: { pulls: 12, sinceEpic: 4, sinceLegendary: 12 },
  lastTick: 1_760_000_000_000,
  stats: { clicks: 40, bestRarityRank: 2, playSeconds: 3600.5, startedAt: 1_758_000_000_000 },
};

describe("exportar e importar partida", () => {
  it("hace el viaje de ida y vuelta sin pérdidas", () => {
    const text = serializeSave(sample);
    const r = parseSave(text);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual(sample);
  });

  it("rechaza texto que no es JSON ni una partida", () => {
    expect(parseSave("hola").ok).toBe(false);
    expect(parseSave("{}").ok).toBe(false);
    expect(parseSave(JSON.stringify({ app: "otro", data: {} })).ok).toBe(false);
  });

  it("detecta una partida editada a mano", () => {
    const text = serializeSave(sample).replace('"capital":1234.5', '"capital":999999');
    const r = parseSave(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/dañada/);
  });

  it("rechaza versiones futuras y valores imposibles", () => {
    expect(parseSave(serializeSave({ ...sample, version: SAVE_VERSION + 1 })).ok).toBe(false);
    expect(parseSave(serializeSave({ ...sample, capital: -1 })).ok).toBe(false);
    expect(parseSave(serializeSave({ ...sample, holdings: { AAPL: { shares: 0, firstAt: 1 } } })).ok).toBe(false);
    expect(parseSave(serializeSave({ ...sample, gacha: { pulls: 1.5, sinceEpic: 0, sinceLegendary: 0 } })).ok).toBe(false);
  });

  it("nombra el archivo con la fecha", () => {
    expect(saveFilename(new Date("2026-10-15T12:00:00Z"))).toBe("capitaldex-partida-2026-10-15.json");
  });
});
