import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { useGame } from "../store/gameStore";

/**
 * Tutorial guiado de la primera partida: una serie de pasos que señalan partes de la interfaz
 * (foco recortado sobre el elemento y una tarjeta con la explicación). Se puede saltar en cualquier
 * momento y se puede volver a ver desde el menú. Los elementos se localizan por `data-tour`.
 */
interface Step {
  target?: string; // valor de data-tour; sin él, la tarjeta va centrada
  tab?: "collection" | "market" | "achievements" | "ranking";
  title: string;
  body: string;
}

const STEPS: Step[] = [
  { target: "machine", title: t("tutorial.s1t"), body: t("tutorial.s1b") },
  { target: "capital", title: t("tutorial.s2t"), body: t("tutorial.s2b") },
  { target: "work", title: t("tutorial.s3t"), body: t("tutorial.s3b") },
  { target: "tab-market", tab: "market", title: t("tutorial.s4t"), body: t("tutorial.s4b") },
  { target: "missions", title: t("tutorial.s5t"), body: t("tutorial.s5b") },
  { target: "tab-achievements", tab: "achievements", title: t("tutorial.s6t"), body: t("tutorial.s6b") },
  { target: "collection", tab: "collection", title: t("tutorial.s7t"), body: t("tutorial.s7b") },
  { title: t("tutorial.s8t"), body: t("tutorial.s8b") },
  { title: t("tutorial.s9t"), body: t("tutorial.s9b") },
];

const PAD = 8;
const CARD_W = 340;
const CARD_H = 190;

/** Cambia la pestaña principal (App escucha este evento). */
export function requestTab(tab: NonNullable<Step["tab"]>) {
  window.dispatchEvent(new CustomEvent("capitaldex:tab", { detail: tab }));
}

export function Tutorial() {
  const introSeen = useGame((s) => s.settings.introSeen);
  const tutorialSeen = useGame((s) => s.settings.tutorialSeen);
  const pulls = useGame((s) => s.gacha.pulls);
  const setSetting = useGame((s) => s.setSetting);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Las partidas ya avanzadas no ven el tutorial de golpe: se da por visto.
  useEffect(() => {
    if (!tutorialSeen && pulls > 12) setSetting("tutorialSeen", true);
  }, [tutorialSeen, pulls, setSetting]);

  const active = introSeen && !tutorialSeen && pulls <= 12;
  const step = STEPS[Math.min(i, STEPS.length - 1)];

  // Cada vez que se abre (primera vez o desde el menú) empieza por el primer paso.
  useEffect(() => {
    if (active) setI(0);
  }, [active]);

  const finish = useCallback(() => {
    setSetting("tutorialSeen", true);
    setI(0);
    requestTab("collection");
  }, [setSetting]);

  // Localiza el elemento del paso, lo trae a la vista y mide su posición.
  const measure = useCallback(() => {
    if (!step.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    setRect(el.getBoundingClientRect());
  }, [step.target]);

  useEffect(() => {
    if (!active) return;
    if (step.tab) requestTab(step.tab);
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const ids = [60, 250, 500, 800].map((ms) => window.setTimeout(measure, ms));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step, measure]);

  // Tarjeta debajo del elemento si cabe; si no, encima; si no hay elemento, centrada.
  useLayoutEffect(() => {
    if (!active) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(CARD_W, vw - 32);
    const h = cardRef.current?.offsetHeight ?? CARD_H;
    if (!rect) {
      setCardPos({ top: Math.max(16, (vh - h) / 2), left: (vw - w) / 2 });
      return;
    }
    let top = rect.bottom + PAD + 12;
    if (top + h > vh - 16) top = rect.top - PAD - 12 - h;
    if (top < 16) top = Math.max(16, Math.min(vh - h - 16, rect.bottom + PAD + 12));
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(16, Math.min(vw - w - 16, left));
    setCardPos({ top, left });
  }, [rect, active, i]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "Enter" || e.key === "ArrowRight") setI((n) => (n + 1 >= STEPS.length ? (finish(), 0) : n + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active) return null;
  const last = i >= STEPS.length - 1;
  const w = Math.min(CARD_W, window.innerWidth - 32);

  return (
    <div className="tour fixed inset-0 z-[45]" role="dialog" aria-labelledby="tour-h" aria-describedby="tour-b">
      {rect ? (
        <div className="tour-hole" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div ref={cardRef} className="tour-card" style={{ top: cardPos?.top ?? 16, left: cardPos?.left ?? 16, width: w }}>
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted">
          <span className="num">{t("tutorial.stepOf", { n: i + 1, total: STEPS.length })}</span>
          <button onClick={finish} className="rounded-md px-2 py-1 hover:bg-surface-2 hover:text-ink">{t("tutorial.skip")}</button>
        </div>
        <h3 id="tour-h" className="mt-1.5 font-sans text-[17px] font-bold leading-tight" style={{ fontVariationSettings: '"opsz" 32' }}>{step.title}</h3>
        <p id="tour-b" className="mt-1.5 text-[13.5px] leading-relaxed text-ink/85 [text-wrap:pretty]">{step.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {STEPS.map((_, k) => <i key={k} className={`h-1.5 w-1.5 rounded-full ${k === i ? "bg-gold" : k < i ? "bg-ink/50" : "bg-line-strong"}`} />)}
          </div>
          <div className="flex gap-2">
            {i > 0 && <button onClick={() => setI(i - 1)} className="btn-ghost h-9 px-3 text-sm">{t("tutorial.back")}</button>}
            <button onClick={() => (last ? finish() : setI(i + 1))} className="btn-primary h-9 px-4 text-sm">{last ? t("tutorial.done") : t("tutorial.next")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
