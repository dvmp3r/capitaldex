import { useEffect, useState } from "react";
import { NEWS_OFFER_SEC } from "../game/news";
import { rarityLabel } from "../game/rarity";
import { effectLabel } from "../game/upgrades";
import { t } from "../i18n";
import { useGame, useMults } from "../store/gameStore";

/** Noticia de última hora: aparece abajo a la derecha durante unos segundos. */
export function NewsBanner() {
  const offer = useGame((s) => s.news.offer);
  const accept = useGame((s) => s.acceptNews);
  const dismiss = useGame((s) => s.dismissNews);
  const mults = useMults();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!offer) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [offer]);

  if (!offer) return null;
  const left = Math.max(0, (offer.expiresAt - now) / 1000);
  const item = offer.item;
  const effect =
    item.kind === "boost"
      ? t("news.boost", { label: effectLabel(item.effect, rarityLabel), sec: Math.round(item.durationSec * mults.newsDuration) })
      : item.kind === "capital"
        ? t("news.capital", { min: Math.round(item.incomeSeconds / 60) })
        : t("news.freePull");

  return (
    <div className="rise fixed bottom-4 right-4 z-30 w-[min(360px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-4 shadow-[0_24px_48px_-16px_oklch(0_0_0/0.9)]" role="alert">
      <div className="flex items-center gap-2">
        <span className="breaking-badge rounded bg-[oklch(0.62_0.22_25)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{t("news.breaking")}</span>
        <span className="num ml-auto text-xs text-muted">{Math.ceil(left)} s</span>
      </div>
      <div className="mt-2 font-sans text-[17px] font-bold leading-tight" style={{ fontVariationSettings: '"opsz" 32' }}>{item.headline}</div>
      <div className="mt-1 text-sm text-up">{effect}</div>
      <div className="meter mt-3">
        <i style={{ width: `${(left / NEWS_OFFER_SEC) * 100}%`, background: "var(--color-up)" }} />
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={accept} className="btn-primary h-10 flex-1 text-sm">{t("news.take")}</button>
        <button onClick={dismiss} className="btn-ghost h-10 px-3 text-sm">{t("news.dismiss")}</button>
      </div>
    </div>
  );
}
