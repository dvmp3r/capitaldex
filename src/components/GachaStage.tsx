import { useEffect, useRef, useState } from "react";
import { playDrop, playKnob, playPop, playRattle, playReveal } from "../game/sound";
import type { PullResult } from "../game/types";
import { t } from "../i18n";
import { useGame } from "../store/gameStore";
import { CompanyCard } from "./CompanyCard";
import { GachaMachine, type MachinePhase } from "./GachaMachine";

interface Props {
  /** Último resultado; cambia de identidad con cada tirada. */
  result: PullResult | null;
  /** Se incrementa con cada tirada para relanzar la secuencia. */
  revealKey: number;
  /** Al pulsar la máquina en reposo. */
  onPull?: () => void;
  pullEnabled?: boolean;
  onPhase?: (phase: MachinePhase) => void;
  className?: string;
}

/** Tiempos de cada fase (ms). Suman unos 1,6 s; se puede saltar tocando. */
const STEPS: [MachinePhase, number][] = [
  ["dropping", 480],
  ["opening", 620],
  ["revealed", 420],
];

/** Escenario del gacha: la máquina, la secuencia de apertura y la carta encima. */
export function GachaStage({ result, revealKey, onPull, pullEnabled = false, onPhase, className = "" }: Props) {
  const sound = useGame((s) => s.settings.sound);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const [phase, setPhase] = useState<MachinePhase>(result ? "revealed" : "idle");
  const timers = useRef<number[]>([]);
  const phaseRef = useRef(onPhase);
  phaseRef.current = onPhase;

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  // Nueva tirada: arranca la secuencia.
  useEffect(() => {
    if (revealKey === 0) return;
    clearTimers();
    const prefersReduced = reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("turning");
    if (prefersReduced) {
      timers.current.push(window.setTimeout(() => setPhase("revealed"), 220));
      return clearTimers;
    }
    let at = 460; // duración del giro
    for (const [p, d] of STEPS) {
      timers.current.push(window.setTimeout(() => setPhase(p), at));
      at += d;
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey]);

  // Sonido y aviso de fase.
  useEffect(() => {
    phaseRef.current?.(phase);
    if (!sound) return;
    if (phase === "turning") {
      playKnob();
      playRattle();
    } else if (phase === "opening") {
      playDrop();
    } else if (phase === "revealed" && result) {
      playPop();
      playReveal(result.rarity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const animating = phase === "turning" || phase === "dropping" || phase === "opening";

  const onStageClick = () => {
    if (animating) {
      clearTimers();
      setPhase("revealed");
    } else if (phase === "idle" && pullEnabled) {
      onPull?.();
    }
  };

  return (
    <div
      className={`stage relative aspect-[5/7] w-full select-none ${phase === "idle" && pullEnabled ? "cursor-pointer" : animating ? "cursor-pointer" : ""} ${className}`}
      onClick={onStageClick}
      role={phase === "idle" && pullEnabled ? "button" : undefined}
      aria-label={phase === "idle" && pullEnabled ? t("gacha.open") : undefined}
      data-legendary={phase === "revealed" && result?.rarity === "legendaria" ? "true" : undefined}
    >
      <GachaMachine phase={phase} capsule={result?.rarity} className={`h-full w-full transition-[filter,opacity,transform] duration-500 ${phase === "revealed" ? "scale-[0.96] opacity-40 blur-[2px]" : ""}`} />
      {phase === "revealed" && result && (
        <div key={revealKey} className="card-pop absolute inset-[4%]">
          <CompanyCard company={result.company} shares={result.shares} size="lg" className="h-full w-full shadow-[0_24px_48px_-16px_oklch(0_0_0/0.35)]" />
        </div>
      )}
      {animating && <span className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-muted">{t("gacha.skipHint")}</span>}
    </div>
  );
}
