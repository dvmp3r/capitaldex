import { clickValue } from "../game/economy";
import { fmt, fmtCapital, fmtMult } from "../game/format";
import { t } from "../i18n";
import { useGame, useIncome } from "../store/gameStore";
import { SaveMenu } from "./SaveMenu";

export function Header() {
  const capital = useGame((s) => s.capital);
  const work = useGame((s) => s.work);
  const income = useIncome();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur-sm">
      {/* Móvil: dos filas (marca + acciones / cifras). Desde sm: una fila. */}
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2 sm:flex sm:gap-6 sm:py-2.5">
        <a href="/" className="order-1 shrink-0 font-sans text-[20px] font-extrabold tracking-tight sm:text-[22px]" style={{ fontVariationSettings: '"opsz" 96' }}>
          Capital<span className="text-gold">Dex</span>
        </a>

        <div className="order-3 col-span-2 flex items-baseline gap-4 sm:order-2 sm:col-span-1 sm:ml-auto sm:gap-5">
          <div className="sm:text-right">
            <div className="num whitespace-nowrap text-[20px] font-bold leading-none sm:text-[26px]">{fmtCapital(capital)}</div>
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
          <button onClick={work} className="btn-primary h-9 shrink-0 whitespace-nowrap px-3 text-sm sm:h-10 sm:px-4" title={t("header.workTitle")}>
            {t("header.work")} <span className="num font-semibold opacity-90">+{fmt(clickValue(income.total))}</span>
          </button>
          <SaveMenu />
        </div>
      </div>
    </header>
  );
}
