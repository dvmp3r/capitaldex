import { Building2, Crown, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { COMPANIES } from "../data/companies";
import { fmtCapital, fmtDuration } from "../game/format";
import { earnedForInfluence, HOLDING_UPGRADES, influenceFor, INFLUENCE_INCOME, type HoldingUpgradeId } from "../game/prestige";
import { t } from "../i18n";
import { useGame } from "../store/gameStore";
import { Wordmark } from "./Logo";

/**
 * Pantalla del holding (prestigio): resumen de la partida, influencia disponible, tienda de mejoras
 * permanentes y el botón de fundar. Se abre desde la cabecera; no bloquea nada hasta confirmar.
 */
export function Holding() {
  const open = useGame((s) => s.holdingOpen);
  const setOpen = useGame((s) => s.openHolding);
  const found = useGame((s) => s.foundHolding);
  const buy = useGame((s) => s.buyHolding);
  const influence = useGame((s) => s.influence);
  const influenceEarned = useGame((s) => s.influenceEarned);
  const lifetimeBase = useGame((s) => s.lifetimeBase);
  const totalEarned = useGame((s) => s.totalEarned);
  const holding = useGame((s) => s.holding);
  const holdingsFounded = useGame((s) => s.holdingsFounded);
  const runStartedAt = useGame((s) => s.runStartedAt);
  const holdings = useGame((s) => s.holdings);
  const discovered = useGame((s) => s.discovered);
  const [confirm, setConfirm] = useState(false);

  const lifetime = lifetimeBase + totalEarned;
  const gain = Math.max(0, influenceFor(lifetime) - influenceEarned);
  const nextAt = earnedForInfluence(influenceEarned + gain + 1);
  const companies = Object.keys(holdings).length;
  const discoveredCount = Object.keys(discovered).length;
  const runSeconds = Math.max(0, (Date.now() - runStartedAt) / 1000);
  const rows = useMemo(() => HOLDING_UPGRADES.map((u) => ({ u, level: holding[u.id] ?? 0 })), [holding]);

  if (!open) return null;

  const onFound = () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setConfirm(false);
    found();
  };
  const onBuy = (id: HoldingUpgradeId) => {
    buy(id);
  };

  return (
    <div className="intro fixed inset-0 z-40 overflow-y-auto text-white" role="dialog" aria-labelledby="holding-h">
      <button onClick={() => { setOpen(false); setConfirm(false); }} className="absolute right-4 top-4 z-10 rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">
        {t("prestige.continue")}
      </button>

      <div className="mx-auto max-w-5xl px-6 pb-16 pt-14">
        <Wordmark size={20} />
        <h1 id="holding-h" className="mt-4 font-sans text-[clamp(36px,6vw,64px)] font-extrabold leading-[0.95] tracking-[-0.03em]" style={{ fontVariationSettings: '"opsz" 96' }}>
          {t("prestige.title")}
        </h1>
        <p className="mt-3 max-w-[60ch] text-[16px] leading-relaxed text-white/85 [text-wrap:pretty]">{t("prestige.lead", { pct: Math.round(INFLUENCE_INCOME * 100) })}</p>

        {/* Resumen de la partida e influencia */}
        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-white/70"><Building2 size={14} aria-hidden="true" />{t("prestige.run", { n: holdingsFounded + 1 })}</div>
            <dl className="num mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-white/70">{t("prestige.runTime")}</dt><dd className="text-right font-bold">{fmtDuration(runSeconds)}</dd>
              <dt className="text-white/70">{t("prestige.runEarned")}</dt><dd className="text-right font-bold">{fmtCapital(totalEarned)}</dd>
              <dt className="text-white/70">{t("prestige.runCompanies")}</dt><dd className="text-right font-bold">{companies}</dd>
              <dt className="text-white/70">{t("prestige.discovered")}</dt><dd className="text-right font-bold">{discoveredCount} / {COMPANIES.length}</dd>
            </dl>
          </div>
          <div className="rounded-2xl border border-gold/40 bg-gold/10 p-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-gold"><Crown size={14} aria-hidden="true" />{t("prestige.influence")}</div>
            <div className="num mt-2 flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-gold">{influence}</span>
              <span className="text-sm text-white/75">{t("prestige.available")}</span>
            </div>
            <div className="num mt-2 text-sm">
              {gain >= 1 ? (
                <span className="font-semibold text-gold">{t("prestige.gainNow", { n: gain })}</span>
              ) : (
                <span className="text-white/75">{t("prestige.needMore", { n: fmtCapital(Math.max(0, nextAt - lifetime)) })}</span>
              )}
            </div>
            <p className="mt-2 text-[12px] leading-snug text-white/70">{t("prestige.incomeBonus", { pct: Math.round(INFLUENCE_INCOME * 100), total: Math.round(INFLUENCE_INCOME * 100 * influenceEarned) })}</p>
          </div>
        </div>

        {/* Qué se pierde y qué se conserva */}
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"><span className="font-semibold text-white/90">{t("prestige.loseTitle")}</span> <span className="text-white/70">{t("prestige.loseList")}</span></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"><span className="font-semibold text-white/90">{t("prestige.keepTitle")}</span> <span className="text-white/70">{t("prestige.keepList")}</span></div>
        </div>

        {/* Tienda del holding */}
        <h2 className="mt-8 flex items-center gap-2 text-lg font-bold"><Sparkles size={18} className="text-gold" aria-hidden="true" />{t("prestige.shop")}</h2>
        <p className="mt-1 text-sm text-white/70">{t("prestige.shopLead")}</p>
        <ul className="mt-3 grid gap-2.5 md:grid-cols-2">
          {rows.map(({ u, level }) => {
            const maxed = level >= u.maxLevel;
            const cost = maxed ? 0 : u.cost(level + 1);
            const can = !maxed && influence >= cost;
            return (
              <li key={u.id} className={`flex flex-col gap-2 rounded-xl border p-4 ${can ? "border-gold/50 bg-gold/[0.07]" : "border-white/12 bg-white/[0.05]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans text-[16px] font-bold" style={{ fontVariationSettings: '"opsz" 32' }}>{u.title}</span>
                  <span className="num rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold">{t("prestige.level", { n: level, max: u.maxLevel })}</span>
                </div>
                <p className="text-[13px] text-white/70 [text-wrap:pretty]">{u.description}</p>
                <div className="num text-[12px] text-white/85">
                  {u.effect(level)}{!maxed && <span className="text-up"> → {u.effect(level + 1)}</span>}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <div className="meter flex-1 bg-white/10"><i style={{ width: `${(level / u.maxLevel) * 100}%`, background: "var(--color-gold)" }} /></div>
                  {maxed ? (
                    <span className="num text-xs font-semibold text-gold">{t("prestige.max")}</span>
                  ) : (
                    <button onClick={() => onBuy(u.id)} disabled={!can} className="btn-primary h-9 shrink-0 px-3 text-[13px]">
                      {t("prestige.buy")} <span className="num font-semibold opacity-90">{cost} ◆</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Fundar */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button onClick={onFound} disabled={gain < 1} className={`h-14 rounded-xl px-6 text-lg font-bold transition active:scale-[0.98] disabled:opacity-50 ${confirm ? "bg-[oklch(0.62_0.22_25)] text-white" : "bg-white text-bg shadow-[0_16px_40px_-14px_oklch(1_0_0/0.45)] hover:brightness-95"}`}>
            {confirm ? t("prestige.foundConfirm", { n: holdingsFounded + 1 }) : t("prestige.found", { n: gain })}
          </button>
          {confirm && <button onClick={() => setConfirm(false)} className="h-14 rounded-xl border border-white/40 px-5 text-base font-semibold text-white hover:bg-white/10">{t("prestige.cancel")}</button>}
          {!confirm && <span className="text-sm text-white/70">{gain >= 1 ? t("prestige.foundHint") : t("prestige.notYet")}</span>}
        </div>
      </div>
    </div>
  );
}
