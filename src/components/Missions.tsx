import { Target } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { rewardLabel } from "../game/achievements";
import { fmtCapital } from "../game/format";
import { missionCurrent, missionProgress } from "../game/missions";
import { playMilestone } from "../game/sound";
import { t } from "../i18n";
import { achievementContextOf, useGame } from "../store/gameStore";

/** Objetivos de partida: tres metas cortas con progreso y recompensa, siempre a la vista. */
export function Missions() {
  const missions = useGame((s) => s.missions);
  const missionsDone = useGame((s) => s.missionsDone);
  const holdings = useGame((s) => s.holdings);
  const gacha = useGame((s) => s.gacha);
  const totalEarned = useGame((s) => s.totalEarned);
  const stats = useGame((s) => s.stats);
  const upgrades = useGame((s) => s.upgrades);
  const sound = useGame((s) => s.settings.sound);
  const ctx = useMemo(() => achievementContextOf({ holdings, gacha, totalEarned, stats, upgrades }), [holdings, gacha, totalEarned, stats, upgrades]);

  // Sonido de hito al completar un objetivo.
  const prevDone = useRef(missionsDone);
  useEffect(() => {
    if (missionsDone > prevDone.current && sound) playMilestone();
    prevDone.current = missionsDone;
  }, [missionsDone, sound]);

  if (!missions.length) return null;

  return (
    <section className="mt-4 rounded-xl border border-line bg-surface px-3 py-3" aria-labelledby="objetivos-h">
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
        <Target size={13} aria-hidden="true" />
        <h3 id="objetivos-h">{t("missions.title")}</h3>
        <span className="num ml-auto">{t("missions.done", { n: missionsDone })}</span>
      </div>
      <ul className="mt-2 space-y-2.5">
        {missions.map((m) => {
          const p = missionProgress(m, ctx);
          const cur = missionCurrent(m, ctx);
          const label = m.kind === "earn" ? `${fmtCapital(cur)} / ${fmtCapital(m.target)}` : `${cur} / ${m.target}`;
          return (
            <li key={m.id} className="mission">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold leading-tight [text-wrap:pretty]">{m.title}</span>
                <span className="num shrink-0 text-[11px] text-muted">{label}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="meter flex-1">
                  <i style={{ width: `${Math.round(p * 100)}%`, background: p >= 1 ? "var(--color-gold)" : "var(--color-brand)" }} />
                </div>
                <span className="num shrink-0 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">{rewardLabel(m.reward)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
