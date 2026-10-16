import { LayoutGrid, Newspaper, Trophy, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { Achievements } from "./components/Achievements";
import { Collection } from "./components/Collection";
import { GachaPanel } from "./components/GachaPanel";
import { Header } from "./components/Header";
import { Holding } from "./components/Holding";
import { Intro } from "./components/Intro";
import { Market } from "./components/Market";
import { NewsBanner } from "./components/NewsBanner";
import { OfflineBanner } from "./components/OfflineBanner";
import { Ranking } from "./components/Ranking";
import { Toasts } from "./components/Toasts";
import { Tutorial } from "./components/Tutorial";
import { TICK_MS } from "./game/balance";
import { fmtCapital } from "./game/format";
import { t } from "./i18n";
import { useGame } from "./store/gameStore";

type Tab = "collection" | "market" | "achievements" | "ranking";

export default function App() {
  const tick = useGame((s) => s.tick);
  const reducedMotion = useGame((s) => s.settings.reducedMotion);
  const [tab, setTab] = useState<Tab>("collection");

  // El tutorial (y cualquier otro componente) puede pedir una pestaña con un evento.
  useEffect(() => {
    const onTab = (e: Event) => setTab((e as CustomEvent<Tab>).detail);
    window.addEventListener("capitaldex:tab", onTab);
    return () => window.removeEventListener("capitaldex:tab", onTab);
  }, []);

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

  // Con la pestaña del navegador en segundo plano, el título muestra el capital (como hacen los idle clásicos).
  useEffect(() => {
    const id = window.setInterval(() => {
      document.title = document.hidden ? `${fmtCapital(useGame.getState().capital)} · CapitalDex` : "CapitalDex";
    }, 2000);
    return () => {
      window.clearInterval(id);
      document.title = "CapitalDex";
    };
  }, []);

  // Barra espaciadora: abrir cartera (si no se está escribiendo en un campo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.tagName === "BUTTON" || el.isContentEditable)) return;
      const s = useGame.getState();
      if (!s.settings.introSeen) return;
      e.preventDefault();
      s.openPack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "collection", label: t("tabs.collection"), icon: <LayoutGrid size={15} aria-hidden="true" /> },
    { id: "market", label: t("tabs.market"), icon: <Newspaper size={15} aria-hidden="true" /> },
    { id: "achievements", label: t("tabs.achievements"), icon: <Trophy size={15} aria-hidden="true" /> },
    { id: "ranking", label: t("tabs.ranking"), icon: <Globe size={15} aria-hidden="true" /> },
  ];

  return (
    <div className="min-h-full">
      <div className="aurora" aria-hidden="true" />
      <Header />
      <div className="px-4">
        <OfflineBanner />
      </div>
      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-6 md:grid-cols-[300px_minmax(0,1fr)] md:gap-10 xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-14">
        <div className="mx-auto w-full max-w-[340px] md:sticky md:top-[72px] md:mx-0 md:max-w-none md:self-start">
          <GachaPanel />
        </div>
        <div className="min-w-0">
          <div className="tabbar mb-5" role="tablist">
            {TABS.map((tb) => (
              <button key={tb.id} role="tab" data-tour={`tab-${tb.id}`} aria-selected={tab === tb.id} className={`tab ${tab === tb.id ? "tab-on" : ""}`} onClick={() => setTab(tb.id)}>
                {tb.icon}
                <span>{tb.label}</span>
              </button>
            ))}
          </div>
          {tab === "collection" ? <Collection /> : tab === "market" ? <Market /> : tab === "achievements" ? <Achievements /> : <Ranking />}
        </div>
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-6 text-[11px] leading-relaxed text-muted [text-wrap:pretty]">
        <p className="max-w-[72ch]">{t("app.disclaimer")}</p>
      </footer>
      <NewsBanner />
      <Toasts />
      <Holding />
      <Tutorial />
      <Intro />
    </div>
  );
}
