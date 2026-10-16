import { t } from "../i18n";
import { SAVE_VERSION } from "./balance";
import { hashString } from "./hash";
import type { SaveData } from "./types";

/** Serializa la partida a texto JSON con una suma de control para detectar archivos corruptos o editados. */
export function serializeSave(data: SaveData): string {
  const payload = JSON.stringify(data);
  return JSON.stringify({ app: "capitaldex", checksum: hashString(payload), data });
}

export type ParseResult = { ok: true; data: SaveData } | { ok: false; error: string };

/** Lee y valida una partida exportada. Nunca lanza: devuelve el error en texto. */
export function parseSave(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: t("save.notJson") };
  }
  if (!isRecord(raw) || raw.app !== "capitaldex" || !isRecord(raw.data)) {
    return { ok: false, error: t("save.notSave") };
  }
  if (raw.checksum !== hashString(JSON.stringify(raw.data))) {
    return { ok: false, error: t("save.corrupt") };
  }
  const d = raw.data;
  if (typeof d.version !== "number" || d.version > SAVE_VERSION) {
    return { ok: false, error: t("save.newerVersion") };
  }
  const nums: (keyof SaveData)[] = ["savedAt", "capital", "totalEarned", "lastTick"];
  for (const k of nums) {
    if (!isFiniteNumber(d[k]) || (d[k] as number) < 0) return { ok: false, error: t("save.invalidField", { field: k }) };
  }
  if (!isRecord(d.gacha) || !isInt(d.gacha.pulls) || !isInt(d.gacha.sinceEpic) || !isInt(d.gacha.sinceLegendary)) {
    return { ok: false, error: t("save.invalidField", { field: "gacha" }) };
  }
  if (!isRecord(d.stats) || !isInt(d.stats.clicks) || !isFiniteNumber(d.stats.playSeconds) || !isFiniteNumber(d.stats.startedAt) || !isInt(d.stats.bestRarityRank)) {
    return { ok: false, error: t("save.invalidField", { field: "stats" }) };
  }
  if (!isRecord(d.holdings)) return { ok: false, error: t("save.invalidField", { field: "holdings" }) };
  for (const [id, h] of Object.entries(d.holdings)) {
    if (!isRecord(h) || !isInt(h.shares) || h.shares < 1 || !isFiniteNumber(h.firstAt)) {
      return { ok: false, error: t("save.invalidCompany", { id }) };
    }
  }
  // Campos de la versión 2 (opcionales en partidas antiguas)
  const upgradesOk = d.upgrades === undefined || (Array.isArray(d.upgrades) && d.upgrades.every((u) => typeof u === "string")) || (isRecord(d.upgrades) && Object.values(d.upgrades).every((v) => isInt(v)));
  if (!upgradesOk) {
    return { ok: false, error: t("save.invalidField", { field: "upgrades" }) };
  }
  if (d.boosts !== undefined && !(Array.isArray(d.boosts) && d.boosts.every((b) => isRecord(b) && typeof b.id === "string" && isFiniteNumber(b.until) && isRecord(b.effect)))) {
    return { ok: false, error: t("save.invalidField", { field: "boosts" }) };
  }
  if (d.freePulls !== undefined && !isInt(d.freePulls)) return { ok: false, error: t("save.invalidField", { field: "freePulls" }) };
  if (d.orders !== undefined && !(typeof d.orders === "number" && Number.isFinite(d.orders) && d.orders >= 0)) return { ok: false, error: t("save.invalidField", { field: "orders" }) };
  if (d.missions !== undefined && !Array.isArray(d.missions)) return { ok: false, error: t("save.invalidField", { field: "missions" }) };
  if (d.missionsDone !== undefined && !isInt(d.missionsDone)) return { ok: false, error: t("save.invalidField", { field: "missionsDone" }) };
  for (const k of ["lifetimeBase", "influence", "influenceEarned", "holdingsFounded", "runStartedAt"] as const) {
    if (d[k] !== undefined && !(typeof d[k] === "number" && Number.isFinite(d[k]) && (d[k] as number) >= 0)) return { ok: false, error: t("save.invalidField", { field: k }) };
  }
  if (d.discovered !== undefined && (typeof d.discovered !== "object" || d.discovered === null)) return { ok: false, error: t("save.invalidField", { field: "discovered" }) };
  if (d.holding !== undefined && (typeof d.holding !== "object" || d.holding === null)) return { ok: false, error: t("save.invalidField", { field: "holding" }) };
  if (d.achievements !== undefined && !(Array.isArray(d.achievements) && d.achievements.every((a) => typeof a === "string"))) {
    return { ok: false, error: t("save.invalidField", { field: "achievements" }) };
  }
  return { ok: true, data: d as unknown as SaveData };
}

export function saveFilename(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  return `capitaldex-partida-${iso}.json`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isInt(v: unknown): v is number {
  return isFiniteNumber(v) && Number.isInteger(v) && v >= 0;
}
