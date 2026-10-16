import { ChevronDown, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { fmtCapital } from "../game/format";
import { rarityLabel } from "../game/rarity";
import { playBuy } from "../game/sound";
import { REGION_NAME, REGIONS } from "../game/regions";
import { RARITIES } from "../game/types";
import { requirementMet, requirementText, SERIES, seriesCost, seriesHeadline, seriesTargetLabel, seriesValueLabel, type Series } from "../game/upgrades";
import { t } from "../i18n";
import { contextOf, useGame, useMults } from "../store/gameStore";

type SectionId = "office" | "sector" | "region" | "rarity";
type Qty = 1 | 10 | "max";
const SECTIONS: { id: SectionId; pick: (s: Series) => boolean }[] = [
  { id: "office", pick: (s) => s.kind !== "sector" && s.kind !== "region" && s.kind !== "rarity" },
  { id: "sector", pick: (s) => s.kind === "sector" },
  { id: "region", pick: (s) => s.kind === "region" },
  { id: "rarity", pick: (s) => s.kind === "rarity" },
];
/** Series bloqueadas que se enseñan por sección (el resto se resume en una línea). */
const LOCKED_SHOWN = 2;

type State = "buy" | "poor" | "locked" | "max";
interface Row { s: Series; level: number; state: State; locked: string | null; cost: number; count: number }

/**
 * Pestaña Mercado: series de titulares en secciones fijas (Oficina, Sectores, Regiones, Rarezas).
 * El orden nunca cambia, para poder seguir una serie con la vista; lo comprable se resalta en su sitio,
 * lo bloqueado se atenúa y solo se enseñan las dos próximas series por desbloquear.
 */
export function Market() {
  const capital = useGame((s) => s.capital);
  const holdings = useGame((s) => s.holdings);
  const pulls = useGame((s) => s.gacha.pulls);
  const levels = useGame((s) => s.upgrades);
  const buyUpgrade = useGame((s) => s.buyUpgrade);
  const sound = useGame((s) => s.settings.sound);
  const mults = useMults();
  const [qty, setQty] = useState<Qty>(1);
  const [open, setOpen] = useState<Record<SectionId, boolean>>({ office: true, sector: true, region: false, rarity: false });

  const ctx = useMemo(() => contextOf(holdings, pulls), [holdings, pulls]);

  const buy = (id: string, count: number) => {
    if (buyUpgrade(id, count) && sound) playBuy();
  };

  /** Niveles que se comprarían con la cantidad elegida y su coste total (parando en requisitos o capital). */
  const plan = (s: Series, level: number): { count: number; cost: number; locked: string | null } => {
    const want = qty === "max" ? s.maxLevel - level : Math.min(qty, s.maxLevel - level);
    let count = 0;
    let cost = 0;
    let locked: string | null = null;
    for (let n = level + 1; n <= level + want; n++) {
      if (!requirementMet(s.requirement(n), ctx)) {
        if (count === 0) locked = requirementText(s.requirement(n), ctx, rarityLabel);
        break;
      }
      const c = seriesCost(s, n);
      if (qty === "max" && cost + c > capital) break;
      cost += c;
      count++;
    }
    return { count, cost, locked };
  };

  const sections = useMemo(() => {
    return SECTIONS.map((sec) => {
      const rows: Row[] = [];
      for (const s of SERIES.filter(sec.pick)) {
        const level = levels[s.id] ?? 0;
        if (level >= s.maxLevel) {
          rows.push({ s, level, state: "max", locked: null, cost: 0, count: 0 });
          continue;
        }
        const p = plan(s, level);
        const state: State = p.locked ? "locked" : p.count > 0 && capital >= p.cost ? "buy" : "poor";
        rows.push({ s, level, state, locked: p.locked, cost: p.count > 0 ? p.cost : seriesCost(s, level + 1), count: p.count });
      }
      // Orden fijo (el de definición). Solo se enseñan las dos primeras bloqueadas; el resto se cuenta.
      let lockedSeen = 0;
      const shown: Row[] = [];
      let hidden = 0;
      for (const r of rows) {
        if (r.state === "locked") {
          if (lockedSeen < LOCKED_SHOWN) { shown.push(r); lockedSeen++; } else hidden++;
        } else shown.push(r);
      }
      const buyable = rows.filter((r) => r.state === "buy").length;
      const maxed = rows.filter((r) => r.state === "max").length;
      return { id: sec.id, rows: shown, hidden, buyable, maxed, total: rows.length };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels, ctx, capital, qty]);

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
    if (mults.autoWorkSeconds > 0) items.push(t("market.autoWork", { n: mults.autoWorkSeconds }));
    if (mults.oddsMult > 1) items.push(t("market.odds", { n: mults.oddsMult.toFixed(2) }));
    return items;
  }, [mults]);

  const bought = Object.values(levels).reduce((n, l) => n + l, 0);
  const buyable = sections.reduce((n, s) => n + s.buyable, 0);

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

      {/* Cantidad por compra, fija arriba */}
      <div className="sticky top-[64px] z-10 mt-4 flex items-center gap-2 rounded-xl border border-line bg-bg/95 px-3 py-2 backdrop-blur-sm sm:top-[72px]">
        <span className="text-[12px] font-semibold text-muted">{t("market.qty")}</span>
        <div role="radiogroup" className="flex gap-1">
          {([1, 10, "max"] as Qty[]).map((q) => (
            <button key={String(q)} role="radio" aria-checked={qty === q} onClick={() => setQty(q)} className={`chip h-8 px-3 ${qty === q ? "chip-on" : ""}`}>
              {q === "max" ? t("market.qtyMax") : `×${q}`}
            </button>
          ))}
        </div>
      </div>

      {sections.map((sec) => (
        <section key={sec.id} className="mt-4" aria-labelledby={`sec-${sec.id}`}>
          <button onClick={() => setOpen((o) => ({ ...o, [sec.id]: !o[sec.id] }))} className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-surface" aria-expanded={open[sec.id]}>
            <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open[sec.id] ? "" : "-rotate-90"}`} aria-hidden="true" />
            <h3 id={`sec-${sec.id}`} className="text-[15px] font-bold">{t(`market.section.${sec.id}`)}</h3>
            <span className="num text-xs text-muted">{t("market.sectionCount", { n: sec.total })}</span>
            {sec.buyable > 0 && <span className="num ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">{sec.buyable}</span>}
            {sec.buyable === 0 && sec.maxed === sec.total && <span className="num ml-auto text-[11px] font-semibold text-gold">{t("market.max")}</span>}
          </button>
          {open[sec.id] && (
            <ul className="mt-1 divide-y divide-line rounded-xl border border-line bg-surface">
              {sec.rows.map((r) => <SeriesRow key={r.s.id} row={r} qty={qty} onBuy={() => buy(r.s.id, r.count)} />)}
              {sec.hidden > 0 && (
                <li className="flex items-center gap-2 px-3 py-2 text-[12px] text-muted"><Lock size={12} aria-hidden="true" />{t("market.moreLocked", { n: sec.hidden })}</li>
              )}
            </ul>
          )}
        </section>
      ))}
    </section>
  );
}

function SeriesRow({ row, qty, onBuy }: { row: Row; qty: Qty; onBuy: () => void }) {
  const { s, level, state, locked, cost, count } = row;
  const [headline, body] = seriesHeadline(s, level);
  const nowLabel = seriesValueLabel(s, level);
  const nextLevel = Math.min(s.maxLevel, level + Math.max(1, count));
  const nextLabel = seriesValueLabel(s, nextLevel);
  const done = state === "max";
  return (
    <li className="series-row grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5" data-state={state}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-muted">
          <span>{s.category}</span>
          <span className="num rounded-full bg-surface-2 px-1.5 py-0.5 text-ink">{t("market.level", { n: level, max: s.maxLevel })}</span>
          <span className="num">
            {seriesTargetLabel(s, rarityLabel)} {nowLabel}{!done && <span className="text-up"> → {nextLabel}</span>}
          </span>
        </div>
        <div className={`mt-0.5 truncate font-sans text-[15px] font-bold leading-tight ${state === "locked" ? "text-muted" : ""}`} style={{ fontVariationSettings: '"opsz" 32' }} title={headline}>
          {headline}
        </div>
        <div className="truncate text-[12px] text-muted" title={locked ?? body}>{locked ?? body}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {done ? (
          <span className="num text-xs font-semibold text-gold">{t("market.max")}</span>
        ) : state === "locked" ? (
          <span className="flex items-center gap-1 text-[11px] text-muted"><Lock size={12} aria-hidden="true" />{t("market.locked")}</span>
        ) : (
          <button onClick={onBuy} disabled={state !== "buy"} className="btn-primary h-9 px-3 text-[13px]">
            {count > 1 ? t("market.levelUpN", { n: count }) : t("market.levelUp")} <span className="num font-semibold opacity-90">{fmtCapital(cost)}</span>
          </button>
        )}
        {!done && (
          <div className="meter w-28">
            <i style={{ width: `${(level / s.maxLevel) * 100}%`, background: state === "buy" ? "var(--color-gold)" : "var(--color-line-strong)" }} />
          </div>
        )}
        {!done && state !== "locked" && qty !== 1 && count === 0 && <span className="num text-[10px] text-muted">{t("market.cantAffordQty")}</span>}
      </div>
    </li>
  );
}
