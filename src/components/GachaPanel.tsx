import { useState } from "react";
import { FREE_PULLS, GACHA_ODDS, PITY_EPIC, PITY_LEGENDARY } from "../game/balance";
import { fmtCapital, fmtDuration, fmtPct } from "../game/format";
import { pullCost } from "../game/gacha";
import { rarityLabel } from "../game/rarity";
import { RARITIES, type Rarity } from "../game/types";
import { t } from "../i18n";
import { useGame } from "../store/gameStore";
import { RARITY_INK } from "./CompanyCard";
import { GachaStage, type StagePhase } from "./GachaStage";

export function GachaPanel() {
  const capital = useGame((s) => s.capital);
  const gacha = useGame((s) => s.gacha);
  const lastPull = useGame((s) => s.lastPull);
  const openPack = useGame((s) => s.openPack);
  const [revealKey, setRevealKey] = useState(0);
  const [phase, setPhase] = useState<StagePhase>("idle");

  const cost = pullCost(gacha.pulls);
  const freeLeft = Math.max(0, FREE_PULLS - gacha.pulls);
  const canAfford = capital >= cost;
  const busy = phase === "turning" || phase === "dropping" || phase === "opening";
  const legendary = lastPull?.rarity === "legendaria";

  const onOpen = () => {
    if (busy) return;
    if (openPack()) setRevealKey((k) => k + 1);
  };

  return (
    <section aria-labelledby="cartera-h">
      <div className="flex items-baseline justify-between">
        <h2 id="cartera-h" className="text-lg font-bold">{t("gacha.title")}</h2>
        <span className="num text-xs text-muted">{t("gacha.opened", { n: gacha.pulls })}</span>
      </div>

      <GachaStage result={lastPull} revealKey={revealKey} onPull={onOpen} pullEnabled={canAfford} onPhase={setPhase} className="mx-auto mt-3 max-w-[280px]" />

      {lastPull && phase === "revealed" && (
        <p key={`msg-${revealKey}`} className="rise mt-3 text-center text-sm">
          {legendary ? (
            <span className="font-bold text-legendaria-ink">{t("gacha.legendary")}</span>
          ) : lastPull.isNew ? (
            <span className="font-bold text-brand">{t("gacha.newCompany")}</span>
          ) : (
            <span className="font-semibold">
              {t("gacha.plusShare")} <span className="num text-muted">{t("gacha.sharesTotal", { n: lastPull.shares })}</span>
            </span>
          )}
          {legendary && lastPull.isNew && <span className="ml-2 text-muted">{t("gacha.newInCollection")}</span>}
          {lastPull.pity && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{t("gacha.guaranteed")}</span>}
        </p>
      )}

      <button onClick={onOpen} disabled={!canAfford || busy} className="btn-primary mt-3 flex h-12 w-full items-center justify-between px-4 text-[15px]">
        <span>{lastPull ? t("gacha.openAnother") : t("gacha.open")}</span>
        <span className="num text-sm font-semibold opacity-90">
          {freeLeft > 0 ? t("gacha.free", { n: freeLeft }) : canAfford ? fmtCapital(cost) : t("gacha.missing", { n: fmtCapital(cost - capital) })}
        </span>
      </button>

      <Hint pulls={gacha.pulls} canAfford={canAfford} lastRarity={lastPull?.rarity} />

      <div className="mt-4 space-y-2.5">
        <Pity label={t("gacha.pityEpic")} left={PITY_EPIC - gacha.sinceEpic} total={PITY_EPIC} color="var(--color-epica)" />
        <Pity label={t("gacha.pityLegendary")} left={PITY_LEGENDARY - gacha.sinceLegendary} total={PITY_LEGENDARY} color="var(--color-legendaria)" />
      </div>

      <details className="mt-4 text-xs text-muted">
        <summary className="cursor-pointer select-none font-medium hover:text-ink">{t("gacha.odds")}</summary>
        <ul className="num mt-2 space-y-1">
          {[...RARITIES].reverse().map((r) => (
            <li key={r} className="flex justify-between">
              <span className={`font-sans font-semibold ${RARITY_INK[r]}`}>{rarityLabel(r)}</span>
              <span>{fmtPct(GACHA_ODDS[r], 0)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 leading-snug">{t("gacha.oddsNote")}</p>
      </details>

      <StatsPanel />
    </section>
  );
}

/** Pistas de las primeras tiradas. Desaparecen solas cuando ya no hacen falta. */
function Hint({ pulls, canAfford, lastRarity }: { pulls: number; canAfford: boolean; lastRarity?: Rarity }) {
  let text: string | null = null;
  if (pulls === 0) text = t("gacha.hint0");
  else if (pulls === 1) text = t("gacha.hint1");
  else if (pulls === 2) text = t("gacha.hint2");
  else if (pulls === FREE_PULLS) text = t("gacha.hintPaid");
  else if (pulls < 8 && !canAfford) text = t("gacha.hintSaving");
  else if (lastRarity === "epica" && pulls < 30) text = t("gacha.hintEpic");
  if (!text) return null;
  return <p className="rise mt-3 text-center text-[13px] leading-snug text-muted [text-wrap:pretty]">{text}</p>;
}

function StatsPanel() {
  const stats = useGame((s) => s.stats);
  const gacha = useGame((s) => s.gacha);
  const holdings = useGame((s) => s.holdings);
  const totalEarned = useGame((s) => s.totalEarned);
  const companies = Object.keys(holdings).length;
  const shares = Object.values(holdings).reduce((n, h) => n + h.shares, 0);
  const best = stats.bestRarityRank >= 0 ? rarityLabel(RARITIES[stats.bestRarityRank]) : "–";
  const since = new Date(stats.startedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

  const rows: [string, string][] = [
    [t("stats.pulls"), String(gacha.pulls)],
    [t("stats.companies"), String(companies)],
    [t("stats.shares"), String(shares)],
    [t("stats.earned"), fmtCapital(totalEarned)],
    [t("stats.clicks"), String(stats.clicks)],
    [t("stats.time"), fmtDuration(stats.playSeconds)],
    [t("stats.best"), best],
    [t("stats.since"), since],
  ];

  return (
    <details className="mt-2 text-xs text-muted">
      <summary className="cursor-pointer select-none font-medium hover:text-ink">{t("stats.title")}</summary>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>{k}</dt>
            <dd className="num text-right font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function Pity({ label, left, total, color }: { label: string; left: number; total: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="num font-medium">{t("gacha.pityIn", { n: left })}</span>
      </div>
      <div className="meter mt-1">
        <i style={{ width: `${((total - left) / total) * 100}%`, background: color }} />
      </div>
    </div>
  );
}
