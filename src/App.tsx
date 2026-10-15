import { useEffect, useState } from "react";
import { Collection } from "./components/Collection";
import { GachaPanel } from "./components/GachaPanel";
import { Header } from "./components/Header";
import { Intro } from "./components/Intro";
import { Market } from "./components/Market";
import { NewsBanner } from "./components/NewsBanner";
import { OfflineBanner } from "./components/OfflineBanner";
import { TICK_MS } from "./game/balance";
import { t } from "./i18n";
import { useGame } from "./store/gameStore";

type Tab = "collection" | "market";

export default function App() {
  const tick = useGame((s) => s.tick);
  const reducedMotion = useGame((s) => s.settings.reducedMotion);
  const [tab, setTab] = useState<Tab>("collection");

  // El ajuste de animaciones reducidas se aplica como atributo en <html>; el CSS lo trata igual que prefers-reduced-motion.
  useEffect(() => {
    if (reducedMotion) document.documentElement.dataset.motion = "reduced";
    else delete document.documentElement.dataset.motion;
  }, [reducedMotion]);

  useEffect(() => {
    const id = window.setInterval(() => tick(Date.now()), TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tick]);

  const tabCls = (active: boolean) =>
    `h-9 rounded-lg px-4 text-sm font-semibold transition-colors ${active ? "bg-ink text-bg" : "text-muted hover:bg-surface hover:text-ink"}`;

  return (
    <div className="min-h-full">
      <Header />
      <div className="px-4">
        <OfflineBanner />
      </div>
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-6 md:grid-cols-[300px_minmax(0,1fr)] md:gap-10 xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-14">
        <div className="mx-auto w-full max-w-[340px] md:sticky md:top-[72px] md:mx-0 md:max-w-none md:self-start">
          <GachaPanel />
        </div>
        <div className="min-w-0">
          <div className="mb-4 flex gap-1 border-b border-line pb-3" role="tablist">
            <button role="tab" aria-selected={tab === "collection"} className={tabCls(tab === "collection")} onClick={() => setTab("collection")}>{t("tabs.collection")}</button>
            <button role="tab" aria-selected={tab === "market"} className={tabCls(tab === "market")} onClick={() => setTab("market")}>{t("tabs.market")}</button>
          </div>
          {tab === "collection" ? <Collection /> : <Market />}
        </div>
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-6 text-[11px] leading-relaxed text-muted [text-wrap:pretty]">
        <p className="max-w-[72ch]">{t("app.disclaimer")}</p>
      </footer>
      <NewsBanner />
      <Intro />
    </div>
  );
}
