import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { SHARE_MILESTONES } from "../game/balance";
import { playDrop, playKnob, playMilestone, playPop, playRattle, playReveal } from "../game/sound";
import type { PullResult, Rarity } from "../game/types";
import { t } from "../i18n";
import { useGame } from "../store/gameStore";
import { CompanyCard } from "./CompanyCard";
import { Machine2D, type MachineHandle } from "./machine/Machine2D";

const Machine3D = lazy(() => import("./machine/Machine3D").then((m) => ({ default: m.Machine3D })));

/** WebGL disponible: máquina 3D; si no, la ilustración 2D. Se decide una vez. */
const HAS_WEBGL = (() => {
  try {
    const cv = document.createElement("canvas");
    return !!(cv.getContext("webgl2") || cv.getContext("webgl"));
  } catch {
    return false;
  }
})();

export type StagePhase = "idle" | "turning" | "dropping" | "opening" | "revealed";

interface Props {
  /** Último resultado; cambia de identidad con cada tirada. */
  result: PullResult | null;
  /** Se incrementa con cada tirada para relanzar la secuencia. */
  revealKey: number;
  /** Al pulsar la máquina en reposo. */
  onPull?: () => void;
  pullEnabled?: boolean;
  onPhase?: (phase: StagePhase) => void;
  className?: string;
}

/**
 * Escenario del gacha: la máquina, la secuencia de apertura y la carta encima.
 * Cada fase espera a que termine la animación anterior; tocar durante la secuencia la salta.
 */
export function GachaStage({ result, revealKey, onPull, pullEnabled = false, onPhase, className = "" }: Props) {
  const sound = useGame((s) => s.settings.sound);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const [phase, setPhase] = useState<StagePhase>(result ? "revealed" : "idle");
  const machine = useRef<MachineHandle>(null);
  const runId = useRef(0);
  const phaseCb = useRef(onPhase);
  phaseCb.current = onPhase;

  // Nueva tirada: secuencia encadenada por promesas.
  useEffect(() => {
    if (revealKey === 0 || !result) return;
    const id = ++runId.current;
    const m = machine.current;
    const alive = () => runId.current === id;
    const prefersReduced = reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      if (!m) {
        // La máquina aún no está montada (módulo 3D cargando): mostrar el resultado sin secuencia.
        setPhase("revealed");
        return;
      }
      m.reset();
      if (prefersReduced) {
        m.skip(result.rarity);
        setPhase("turning");
        await new Promise((r) => window.setTimeout(r, 200));
        if (alive()) setPhase("revealed");
        return;
      }
      setPhase("turning");
      await m.turn();
      if (!alive()) return;
      setPhase("dropping");
      await m.drop(result.rarity);
      if (!alive()) return;
      setPhase("opening");
      await m.open();
      if (!alive()) return;
      setPhase("revealed");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey]);

  // Sonido y aviso de fase.
  useEffect(() => {
    phaseCb.current?.(phase);
    if (!sound) return;
    if (phase === "turning") {
      playKnob();
      playRattle();
    } else if (phase === "opening") {
      playDrop();
    } else if (phase === "revealed" && result && revealKey > 0) {
      playPop();
      playReveal(result.rarity);
      if (SHARE_MILESTONES.some((m) => m.shares === result.shares)) window.setTimeout(playMilestone, 900);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const animating = phase === "turning" || phase === "dropping" || phase === "opening";
  const clickable = animating || (phase === "idle" && pullEnabled);

  const onStageClick = () => {
    if (animating && result) {
      runId.current++;
      machine.current?.skip(result.rarity);
      setPhase("revealed");
    } else if (phase === "idle" && pullEnabled) {
      onPull?.();
    }
  };

  return (
    <div
      className={`stage relative aspect-[5/7] w-full select-none ${clickable ? "cursor-pointer" : ""} ${className}`}
      onClick={onStageClick}
      role={phase === "idle" && pullEnabled ? "button" : undefined}
      aria-label={phase === "idle" && pullEnabled ? t("gacha.open") : undefined}
      data-reveal={phase === "revealed" && result ? result.rarity : undefined}
    >
      <div className="stage-light" />
      {phase === "revealed" && result && (result.rarity === "epica" || result.rarity === "legendaria") && <div className="stage-rays" />}
      {HAS_WEBGL ? (
        <Suspense fallback={<div className="h-full w-full" />}>
          <Machine3D ref={machine} dimmed={phase === "revealed"} className="h-full w-full" />
        </Suspense>
      ) : (
        <Machine2D ref={machine} dimmed={phase === "revealed"} idle={phase === "idle" || phase === "revealed"} className="h-full w-full" />
      )}
      {phase === "revealed" && result && (
        <div key={revealKey} className={`card-rise card-rise-${result.rarity} absolute inset-[4%]`}>
          <CompanyCard company={result.company} shares={result.shares} size="lg" className="h-full w-full shadow-[0_30px_60px_-20px_oklch(0_0_0/0.9)]" />
          {revealKey > 0 && SPARKS[result.rarity] > 0 && <div className="card-sheen" />}
        </div>
      )}
      {phase === "revealed" && result && revealKey > 0 && SPARKS[result.rarity] > 0 && (
        <Confetti key={`c-${revealKey}`} count={SPARKS[result.rarity]} hue={SPARK_HUE[result.rarity]} />
      )}
      {animating && <span className="absolute bottom-1 left-0 right-0 text-center text-[11px] text-muted">{t("gacha.skipHint")}</span>}
    </div>
  );
}

/** Chispas por rareza: cuántas y de qué tono. Común y poco común no tienen. */
const SPARKS: Record<Rarity, number> = { comun: 0, poco_comun: 0, rara: 12, epica: 24, legendaria: 44 };
const SPARK_HUE: Record<Rarity, number> = { comun: 0, poco_comun: 155, rara: 255, epica: 300, legendaria: 88 };

/** Trocitos de color que salen disparados desde el centro. Solo CSS. */
function Confetti({ count, hue }: { count: number; hue: number }) {
  const gold = hue === 88;
  const pieces = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const d = (gold ? 90 : 70) + Math.random() * (gold ? 160 : 110);
    return {
      dx: Math.cos(a) * d, dy: Math.sin(a) * d - 60, rot: Math.random() * 720 - 360, delay: Math.random() * 120,
      hue: hue + (Math.random() - 0.5) * 20, l: (gold ? 0.8 : 0.7) + Math.random() * 0.15,
    };
  });
  return (
    <>
      {pieces.map((p, i) => (
        <i key={i} className="confetti" style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--rot": `${p.rot}deg`, animationDelay: `${p.delay}ms`, background: `oklch(${p.l} 0.17 ${p.hue})` } as React.CSSProperties} />
      ))}
    </>
  );
}
