import { useEffect, useRef, useState } from "react";
import { useLiveValue } from "../hooks/useTween";
import { ORDERS_REFILL_SECONDS } from "../game/balance";
import { COMPANIES } from "../data/companies";
import { influenceFor } from "../game/prestige";
import { Crown } from "lucide-react";
import { clickValue } from "../game/economy";
import { fmt, fmtCapital, fmtMult } from "../game/format";
import { rarityLabel } from "../game/rarity";
import { playClick } from "../game/sound";
import { effectLabel } from "../game/upgrades";
import { t } from "../i18n";
import { ordersMaxOf, useGame, useIncome, useMults } from "../store/gameStore";
import { Account } from "./Account";
import { Wordmark } from "./Logo";
import { SaveMenu } from "./SaveMenu";

export function Header() {
  const capital = useGame((s) => s.capital);
  const work = useGame((s) => s.work);
  const orders = useGame((s) => s.orders);
  const ordersMax = useGame((s) => ordersMaxOf(s.holding));
  const discoveredCount = useGame((s) => Object.keys(s.discovered).length);
  const influenceGain = useGame((s) => Math.max(0, influenceFor(s.lifetimeBase + s.totalEarned) - s.influenceEarned));
  const influence = useGame((s) => s.influence);
  const holdingsFounded = useGame((s) => s.holdingsFounded);
  const openHolding = useGame((s) => s.openHolding);
  const showHolding = influenceGain >= 1 || influence > 0 || holdingsFounded > 0;
  const boosts = useGame((s) => s.boosts);
  const freePulls = useGame((s) => s.freePulls);
  const sound = useGame((s) => s.settings.sound);
  const lastTick = useGame((s) => s.lastTick);
  const income = useIncome();
  const mults = useMults();
  const shown = useLiveValue(capital, income.total, lastTick);
  const [floats, setFloats] = useState<{ id: number; text: string; x: number }[]>([]);
  const seq = useRef(0);
  const [pop, setPop] = useState(0);
  const lastCapital = useRef(capital);

  // Entrada grande de capital (noticia, Operar, offline): el número da un salto.
  useEffect(() => {
    const jump = capital - lastCapital.current;
    lastCapital.current = capital;
    if (jump > Math.max(10, income.total * 2)) setPop((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capital]);

  const onWork = () => {
    const gain = work();
    if (gain <= 0) return;
    if (sound) playClick();
    const id = ++seq.current;
    setFloats((f) => [...f.slice(-5), { id, text: `+${fmt(gain)}`, x: 30 + Math.random() * 40 }]);
    window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 950);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur-sm">
      {/* Móvil: dos filas (marca + acciones / cifras). Desde sm: una fila. */}
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2 sm:flex sm:gap-6 sm:py-2.5">
        <a href="./" className="order-1 shrink-0" aria-label="CapitalDex">
          <Wordmark size={21} />
        </a>

        <div className="order-3 col-span-2 flex items-baseline gap-4 sm:order-2 sm:col-span-1 sm:ml-auto sm:gap-5" data-tour="capital">
          <div className="sm:text-right">
            <div key={pop} className={`num whitespace-nowrap text-[20px] font-bold leading-none sm:text-[26px] ${pop ? "pop" : ""}`}>{fmtCapital(shown)}</div>
            <div className="mt-0.5 text-[11px] text-muted">{t("header.capital")}</div>
          </div>
          <div className="sm:text-right">
            <div className="num whitespace-nowrap text-[15px] font-semibold leading-none text-up sm:text-[17px]">+{fmt(income.total)}/s</div>
            <div className="mt-0.5 whitespace-nowrap text-[11px] text-muted">
              {income.setsMult > 1 ? (
                <span title={t("header.indicesMultTitle")}>{t("header.indicesMult", { mult: fmtMult(income.setsMult) })}</span>
              ) : (
                t("header.income")
              )}
            </div>
          </div>
        </div>

        <div className="order-2 flex items-center gap-2 sm:order-3">
          <div className="relative" data-tour="work">
            <button
              onClick={onWork}
              disabled={orders < 1}
              className="btn-primary relative h-9 shrink-0 overflow-hidden whitespace-nowrap px-3 text-sm sm:h-10 sm:px-4"
              title={orders < 1 ? t("header.noOrders") : t("header.workTitle", { n: Math.round(mults.clickSeconds), refill: ORDERS_REFILL_SECONDS })}
              aria-label={`${t("header.work")} +${fmt(clickValue(income.total, mults.clickSeconds))} · ${t("header.orders", { n: Math.floor(orders), max: ordersMax })}`}
            >
              {t("header.work")} <span className="num font-semibold opacity-90">+{fmt(clickValue(income.total, mults.clickSeconds))}</span>
              <span className="num ml-2 rounded-full bg-black/20 px-1.5 text-[11px] font-semibold">{Math.floor(orders)}/{ordersMax}</span>
              <i aria-hidden className="absolute bottom-0 left-0 h-[3px] bg-black/35 transition-[width] duration-300" style={{ width: `${(orders / ordersMax) * 100}%` }} />
            </button>
            {floats.map((f) => (
              <span key={f.id} className="float-num text-sm" style={{ left: `${f.x}%`, top: "-4px" }}>{f.text}</span>
            ))}
          </div>
          {showHolding && (
            <button onClick={() => openHolding(true)} className={`relative flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold transition sm:h-10 ${influenceGain >= 1 ? "holding-ready text-bg" : "btn-ghost"}`} title={t("prestige.button")}>
              <Crown size={15} aria-hidden="true" />
              <span className="hidden sm:inline">{t("prestige.button")}</span>
              {influenceGain >= 1 && <span className="num rounded-full bg-black/20 px-1.5 text-[11px] font-bold">+{influenceGain}</span>}
            </button>
          )}
          <Account />
          <SaveMenu />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 pb-2 text-[12px]">
        <span className="flex items-center gap-2 text-muted" title={t("header.collectionTitle")} data-tour="collection">
          <span className="num">{t("header.collection", { n: discoveredCount, total: COMPANIES.length })}</span>
          <span className="meter w-24"><i style={{ width: `${(discoveredCount / COMPANIES.length) * 100}%`, background: "var(--color-gold)" }} /></span>
        </span>
        {freePulls > 0 && <span className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold">{t("news.freePullsLeft", { n: freePulls })}</span>}
        {boosts.map((b) => <BoostChip key={b.id} label={effectLabel(b.effect, rarityLabel)} until={b.until} />)}
      </div>
    </header>
  );
}

function BoostChip({ label, until }: { label: string; until: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <span className="rounded-full bg-up-soft px-2 py-0.5 font-semibold text-up">
      {label} <span className="num font-medium opacity-80">· {left} s</span>
    </span>
  );
}
