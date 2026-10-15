import { useMemo } from "react";
import { fmtCapital } from "../game/format";
import { rarityLabel } from "../game/rarity";
import { REGION_NAME, REGIONS } from "../game/regions";
import { RARITIES } from "../game/types";
import { effectLabel, requirementMet, requirementText, UPGRADES, type Upgrade } from "../game/upgrades";
import { t } from "../i18n";
import { contextOf, useGame, useMults } from "../store/gameStore";

/** Pestaña Mercado: los titulares (mejoras permanentes) y el resumen de multiplicadores. */
export function Market() {
  const capital = useGame((s) => s.capital);
  const holdings = useGame((s) => s.holdings);
  const pulls = useGame((s) => s.gacha.pulls);
  const upgrades = useGame((s) => s.upgrades);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const mults = useMults();

  const ctx = useMemo(() => contextOf(holdings, pulls, upgrades), [holdings, pulls, upgrades]);
  const owned = ctx.owned;

  const { available, locked, bought } = useMemo(() => {
    const byCost = (a: Upgrade, b: Upgrade) => a.cost - b.cost;
    const available: Upgrade[] = [];
    const locked: Upgrade[] = [];
    const bought: Upgrade[] = [];
    for (const u of UPGRADES) {
      if (owned.has(u.id)) bought.push(u);
      else if (requirementMet(u.requires, ctx)) available.push(u);
      // Solo se enseñan los bloqueados cuyo titular previo ya está comprado: el siguiente escalón de cada serie.
      else if (!u.requires?.upgrade || owned.has(u.requires.upgrade)) locked.push(u);
    }
    return { available: available.sort(byCost), locked: locked.sort(byCost), bought };
  }, [ctx, owned]);

  const summary = useMemo(() => {
    const items: string[] = [];
    if (mults.global > 1) items.push(`Todo ×${mults.global}`);
    for (const [sector, m] of Object.entries(mults.sector)) if (m > 1) items.push(`${sector} ×${m}`);
    for (const r of REGIONS) if (mults.region[r] > 1) items.push(`${REGION_NAME[r]} ×${mults.region[r]}`);
    for (const r of RARITIES) if (mults.rarity[r] > 1) items.push(`${rarityLabel(r)}s ×${mults.rarity[r]}`);
    if (mults.gachaCost < 1) items.push(t("market.gacha", { pct: Math.round((1 - mults.gachaCost) * 100) }));
    items.push(t("market.clickSeconds", { n: mults.clickSeconds }));
    items.push(t("market.offline", { rate: Math.round(mults.offlineRate * 100), hours: Math.round(mults.offlineCapSeconds / 3600) }));
    if (mults.newsFrequency > 1) items.push(t("market.newsFreq", { n: mults.newsFrequency }));
    return items;
  }, [mults]);

  return (
    <section aria-labelledby="mercado-h" className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="mercado-h" className="text-lg font-bold">{t("market.title")}</h2>
        <span className="num text-sm text-muted">{t("market.ownedCount", { n: bought.length })}</span>
      </div>
      <p className="mt-1 max-w-[60ch] text-sm text-muted [text-wrap:pretty]">{t("market.intro")}</p>

      <div className="mt-4 rounded-xl border border-line bg-surface px-4 py-3">
        <div className="text-[12px] font-semibold text-muted">{t("market.multipliers")}</div>
        <div className="num mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {summary.map((s) => <span key={s}>{s}</span>)}
        </div>
      </div>

      <h3 className="mt-6 text-base font-bold">{t("market.available")}</h3>
      {available.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{t("market.noneAvailable")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {available.map((u) => (
            <Headline key={u.id} u={u} canAfford={capital >= u.cost} onBuy={() => buyUpgrade(u.id)} />
          ))}
        </ul>
      )}

      {locked.length > 0 && (
        <>
          <h3 className="mt-8 text-base font-bold">{t("market.locked")}</h3>
          <ul className="mt-2 divide-y divide-line">
            {locked.slice(0, 12).map((u) => (
              <Headline key={u.id} u={u} locked={requirementText(u.requires, ctx, rarityLabel) ?? undefined} />
            ))}
          </ul>
        </>
      )}

      {bought.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer select-none text-base font-bold">{t("market.owned")} <span className="num text-sm font-normal text-muted">({bought.length})</span></summary>
          <ul className="mt-2 divide-y divide-line opacity-80">
            {bought.map((u) => <Headline key={u.id} u={u} done />)}
          </ul>
        </details>
      )}
    </section>
  );
}

function Headline({ u, canAfford, onBuy, locked, done }: { u: Upgrade; canAfford?: boolean; onBuy?: () => void; locked?: string; done?: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-60">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted">
          <span>{u.category}</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink">{effectLabel(u.effect, rarityLabel)}</span>
        </div>
        <div className={`mt-1 font-sans text-[17px] font-bold leading-tight ${done ? "" : locked ? "text-muted" : ""}`} style={{ fontVariationSettings: '"opsz" 32' }}>
          {u.headline}
        </div>
        <div className="mt-0.5 text-[13px] text-muted">{locked ?? u.body}</div>
      </div>
      {done ? (
        <span className="num text-xs text-muted">✓</span>
      ) : locked ? (
        <span className="num text-sm text-muted">{fmtCapital(u.cost)}</span>
      ) : (
        <button onClick={onBuy} disabled={!canAfford} className="btn-primary h-10 shrink-0 px-4 text-sm">
          {t("market.buy")} <span className="num font-semibold opacity-90">{fmtCapital(u.cost)}</span>
        </button>
      )}
    </li>
  );
}
