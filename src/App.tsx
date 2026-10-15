import { useEffect } from "react";
import { Collection } from "./components/Collection";
import { GachaPanel } from "./components/GachaPanel";
import { Header } from "./components/Header";
import { OfflineBanner } from "./components/OfflineBanner";
import { TICK_MS } from "./game/balance";
import { t } from "./i18n";
import { useGame } from "./store/gameStore";

export default function App() {
  const tick = useGame((s) => s.tick);
  const reducedMotion = useGame((s) => s.settings.reducedMotion);

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

  return (
    <div className="min-h-full">
      <Header />
      <div className="px-4">
        <OfflineBanner />
      </div>
      {/* minmax(0,1fr): la fila de índices con scroll horizontal no debe ensanchar la rejilla. */}
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-6 md:grid-cols-[300px_minmax(0,1fr)] md:gap-10 xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-14">
        <div className="mx-auto w-full max-w-[340px] md:sticky md:top-[72px] md:mx-0 md:max-w-none md:self-start">
          <GachaPanel />
        </div>
        <Collection />
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-6 text-[11px] leading-relaxed text-muted [text-wrap:pretty]">
        <p className="max-w-[72ch]">{t("app.disclaimer")}</p>
      </footer>
    </div>
  );
}
