import { useMemo, useState } from "react";
import { fmtCapital } from "../game/format";
import { rarityLabel } from "../game/rarity";
import { playBuy } from "../game/sound";
import { REGION_NAME, REGIONS } from "../game/regions";
import { RARITIES } from "../game/types";
import { requirementText, SERIES, seriesCost, seriesHeadline, seriesTargetLabel, seriesValueLabel, type Series } from "../game/upgrades";
import { t } from "../i18n";
import { contextOf, useGame, useMults } from "../store/gameStore";

type Filter = "all" | "sector" | "region" | "rarity" | "office";
const FILTERS: Filter[] = ["all", "sector", "region", "rarity", "office"];
const groupOf = (s: Series): Filter => (s.kind === "sector" || s.kind === "region" || s.kind === "rarity" ? s.kind : "office");

type State = "buy" | "poor" | "locked" | "max";
interface Row { s: Series; level: number; cost: number; locked: string | null; state: State }

/** Pestaña Mercado: las series de titulares por niveles, filtrables por grupo, y el resumen de multiplicadores. */
export function Market() {
  const capital = useGame((s) => s.capital);
  const holdings = useGame((s) => s.holdings);
  const pulls = useGame((s) => s.gacha.pulls);
  const levels = useGame((s) => s.upgrades);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const sound = useGame((s) => s.settings.sound);
  const mults = useMults();
  const [filter, setFilter] = useState<Filter>("all");
  const buy = (id: string) => {
    if (buyUpgrade(id) && sound) playBuy();
  };

  const ctx = useMemo(() => contextOf(holdings, pulls), [holdings, pulls]);

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const s of SERIES) {
      if (filter !== "all" && groupOf(s) !== filter) continue;
      const level = levels[s.id] ?? 0;
      if (level >= s.maxLevel) {
        out.push({ s, level, cost: 0, locked: null, state: "max" });
        continue;
      }
      const next = level + 1;
      const cost = seriesCost(s, next);
      const locked = requirementText(s.requirement(next), ctx, rarityLabel);
      out.push({ s, level, cost, locked, state: locked ? "locked" : capital >= cost ? "buy" : "poor" });
    }
    // Primero lo comprable (por coste), luego lo que falta capital, luego lo bloqueado; al máximo, al final.
    const rank: Record<State, number> = { buy: 0, poor: 1, locked: 2, max: 3 };
    out.sort((a, b) => rank[a.state] - rank[b.state] || a.cost - b.cost);
    return out;
  }, [levels, ctx, capital, filter]);

  const summary = useMemo(() => {
    const items: string[] = [];
    if (mults.global > 1) items.push(`Todo ×${mults.global.toFixed(2)}`);
    for (const [sector, m] of Object.entries(mults.sector)) if (m > 1) items.push(`${sector} ×${m.toFixed(2)}`);
    for (const r of REGIONS) if (mults.region[r] > 1) items.push(`${REGION_NAME[r]} ×${mults.region[r].toFixed(2)}`);
    for (const r of RARITIES) if (mults.rarity[r] > 1) items.push(`${rarityLabel(r)}s ×${mults.rarity[r].toFixed(2)}`);
    if (mults.gachaCost < 1) items.push(t("market.gacha", { pct: Math.round((1 - mults.gachaCost) * 100) }));
    items.push(t("market.clickSeconds", { n: Math.round(mults.clickSeconds) }));
    items.push(t("market.offline", { rate: Math.round(mults.offlineRate * 100), hours: Math.round(mults.offlineCapSeconds / 3600) }));
    if (mults.newsFrequency > 1) items.push(t("market.newsFreq", { n: mults.newsFrequency.toFixed(2) }));
    if (mults.autoPullSeconds > 0) items.push(t("market.autoPull", { n: mults.autoPullSeconds }));
    return items;
  }, [mults]);

  const bought = Object.values(levels).reduce((n, l) => n + l, 0);
  const buyable = rows.filter((r) => r.state === "buy").length;

  return (
    <section aria-labelledby="mercado-h" className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="mercado-h" className="text-lg font-bold">{t("market.title")}</h2>
        <span className="num text-sm text-muted">{t("market.levelsBought", { n: bought })}</span>
        {buyable > 0 && <span className="num rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">{t("market.buyableNow", { n: buyable })}</span>}
      </div>
      <p className="mt-1 max-w-[60ch] text-sm text-muted [text-wrap:pretty]">{t("market.intro")}</p>

      <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3">
        <div className="text-[12px] font-semibold text-muted">{t("market.multipliers")}</div>
        <div className="num mt-2 flex flex-wrap gap-1.5 text-[12px]">
          {summary.map((s) => <span key={s} className="rounded-full bg-surface-2 px-2.5 py-1">{s}</span>)}
        </div>
      </div>

      <div role="tablist" aria-label={t("market.filters")} className="mt-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`chip ${filter === f ? "chip-on" : ""}`}>
            {t(`market.filter.${f}`)}
          </button>
        ))}
      </div>

      <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
        {rows.map((r) => <SeriesCard key={r.s.id} row={r} onBuy={() => buy(r.s.id)} />)}
      </ul>
    </section>
  );
}

function SeriesCard({ row, onBuy }: { row: Row; onBuy: () => void }) {
  const { s, level, cost, locked, state } = row;
  const [headline, body] = seriesHeadline(s, level);
  const nowLabel = seriesValueLabel(s, level);
  const nextLabel = seriesValueLabel(s, Math.min(s.maxLevel, level + 1));
  const done = state === "max";
  return (
    <li className="series-card flex flex-col gap-2 rounded-xl border border-line bg-surface p-3" data-state={state}>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted">
        <span className="rounded-full bg-surface-2 px-2 py-0.5">{s.category}</span>
        <span className="num rounded-full bg-surface-2 px-2 py-0.5 text-ink">{t("market.level", { n: level, max: s.maxLevel })}</span>
        <span className="num ml-auto text-ink">
          {seriesTargetLabel(s, rarityLabel)} {nowLabel}{!done && <span className="text-up"> → {nextLabel}</span>}
        </span>
      </div>
      <div>
        <div className={`font-sans text-[16px] font-bold leading-tight [text-wrap:balance] ${locked ? "text-muted" : ""}`} style={{ fontVariationSettings: '"opsz" 32' }}>
          {headline}
        </div>
        <div className="mt-0.5 text-[12.5px] text-muted [text-wrap:pretty]">{locked ?? body}</div>
      </div>
      <div className="mt-auto flex items-center gap-3">
        <div className="meter flex-1">
          <i style={{ width: `${(level / s.maxLevel) * 100}%`, background: done ? "var(--color-gold)" : state === "buy" ? "var(--color-gold)" : "var(--color-line-strong)" }} />
        </div>
        {done ? (
          <span className="num text-xs font-semibold text-gold">{t("market.max")}</span>
        ) : locked ? (
          <button disabled title={locked} className="btn-primary h-9 shrink-0 px-3 text-[13px] opacity-45 grayscale">
            {t("market.locked")} <span className="num font-semibold opacity-90">{fmtCapital(cost)}</span>
          </button>
        ) : (
          <button onClick={onBuy} disabled={state !== "buy"} className="btn-primary h-9 shrink-0 px-3 text-[13px]">
            {t("market.levelUp")} <span className="num font-semibold opacity-90">{fmtCapital(cost)}</span>
          </button>
        )}
      </div>
    </li>
  );
}
