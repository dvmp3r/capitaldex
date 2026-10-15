import { useMemo } from "react";
import { fmtCapital } from "../game/format";
import { rarityLabel } from "../game/rarity";
import { REGION_NAME, REGIONS } from "../game/regions";
import { RARITIES } from "../game/types";
import { requirementText, SERIES, seriesCost, seriesHeadline, seriesTargetLabel, seriesValueLabel, type Series } from "../game/upgrades";
import { t } from "../i18n";
import { contextOf, useGame, useMults } from "../store/gameStore";

/** Pestaña Mercado: las series de titulares por niveles y el resumen de multiplicadores. */
export function Market() {
  const capital = useGame((s) => s.capital);
  const holdings = useGame((s) => s.holdings);
  const pulls = useGame((s) => s.gacha.pulls);
  const levels = useGame((s) => s.upgrades);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const mults = useMults();

  const ctx = useMemo(() => contextOf(holdings, pulls), [holdings, pulls]);

  const rows = useMemo(() => {
    const open: { s: Series; level: number; cost: number; locked: string | null }[] = [];
    const maxed: { s: Series; level: number }[] = [];
    for (const s of SERIES) {
      const level = levels[s.id] ?? 0;
      if (level >= s.maxLevel) {
        maxed.push({ s, level });
        continue;
      }
      const next = level + 1;
      open.push({ s, level, cost: seriesCost(s, next), locked: requirementText(s.requirement(next), ctx, rarityLabel) });
    }
    // Primero lo que se puede comprar ya, por coste; después lo bloqueado, por coste.
    open.sort((a, b) => Number(!!a.locked) - Number(!!b.locked) || a.cost - b.cost);
    return { open, maxed };
  }, [levels, ctx]);

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
    return items;
  }, [mults]);

  const bought = Object.values(levels).reduce((n, l) => n + l, 0);

  return (
    <section aria-labelledby="mercado-h" className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="mercado-h" className="text-lg font-bold">{t("market.title")}</h2>
        <span className="num text-sm text-muted">{t("market.levelsBought", { n: bought })}</span>
      </div>
      <p className="mt-1 max-w-[60ch] text-sm text-muted [text-wrap:pretty]">{t("market.intro")}</p>

      <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3">
        <div className="text-[12px] font-semibold text-muted">{t("market.multipliers")}</div>
        <div className="num mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {summary.map((s) => <span key={s}>{s}</span>)}
        </div>
      </div>

      <ul className="mt-5 divide-y divide-line">
        {rows.open.map(({ s, level, cost, locked }) => (
          <SeriesRow key={s.id} s={s} level={level} cost={cost} locked={locked} canAfford={capital >= cost} onBuy={() => buyUpgrade(s.id)} />
        ))}
      </ul>

      {rows.maxed.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer select-none text-base font-bold">{t("market.maxed")} <span className="num text-sm font-normal text-muted">({rows.maxed.length})</span></summary>
          <ul className="mt-2 divide-y divide-line opacity-80">
            {rows.maxed.map(({ s, level }) => <SeriesRow key={s.id} s={s} level={level} cost={0} locked={null} done />)}
          </ul>
        </details>
      )}
    </section>
  );
}

function SeriesRow({ s, level, cost, locked, canAfford, onBuy, done }: { s: Series; level: number; cost: number; locked: string | null; canAfford?: boolean; onBuy?: () => void; done?: boolean }) {
  const [headline, body] = seriesHeadline(s, level);
  const nowLabel = seriesValueLabel(s, level);
  const nextLabel = seriesValueLabel(s, Math.min(s.maxLevel, level + 1));
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-60">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted">
          <span>{s.category}</span>
          <span className="num rounded-full bg-surface-2 px-2 py-0.5 text-ink">{t("market.level", { n: level, max: s.maxLevel })}</span>
          <span className="num rounded-full bg-surface-2 px-2 py-0.5 text-ink">
            {seriesTargetLabel(s, rarityLabel)} {nowLabel}{!done && <span className="text-up"> → {nextLabel}</span>}
          </span>
        </div>
        <div className={`mt-1 font-sans text-[17px] font-bold leading-tight ${locked ? "text-muted" : ""}`} style={{ fontVariationSettings: '"opsz" 32' }}>
          {headline}
        </div>
        <div className="mt-0.5 text-[13px] text-muted">{locked ?? body}</div>
        {!done && (
          <div className="meter mt-2 max-w-[220px]">
            <i style={{ width: `${(level / s.maxLevel) * 100}%`, background: "var(--color-gold)" }} />
          </div>
        )}
      </div>
      {done ? (
        <span className="num text-xs text-gold">{t("market.max")}</span>
      ) : locked ? (
        <span className="num text-sm text-muted">{fmtCapital(cost)}</span>
      ) : (
        <button onClick={onBuy} disabled={!canAfford} className="btn-primary h-10 shrink-0 px-4 text-sm">
          {t("market.levelUp")} <span className="num font-semibold opacity-90">{fmtCapital(cost)}</span>
        </button>
      )}
    </li>
  );
}
