import { useMemo } from "react";
import { ACHIEVEMENTS, rewardLabel } from "../game/achievements";
import { t } from "../i18n";
import { useGame } from "../store/gameStore";

/** Pestaña Logros: lista de hitos con su recompensa; los conseguidos van primero. */
export function Achievements() {
  const unlocked = useGame((s) => s.achievements);
  const have = useMemo(() => new Set(unlocked), [unlocked]);
  const rows = useMemo(() => {
    const done = ACHIEVEMENTS.filter((a) => have.has(a.id));
    const todo = ACHIEVEMENTS.filter((a) => !have.has(a.id));
    return { done, todo };
  }, [have]);

  return (
    <section aria-labelledby="logros-h" className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="logros-h" className="text-lg font-bold">{t("achievements.title")}</h2>
        <span className="num text-sm text-muted">{t("achievements.count", { n: rows.done.length, total: ACHIEVEMENTS.length })}</span>
      </div>
      <p className="mt-1 max-w-[60ch] text-sm text-muted [text-wrap:pretty]">{t("achievements.intro")}</p>
      <div className="meter mt-3 max-w-[320px]">
        <i style={{ width: `${(rows.done.length / ACHIEVEMENTS.length) * 100}%`, background: "var(--color-gold)" }} />
      </div>

      <ul className="mt-5 divide-y divide-line">
        {rows.done.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">✓</span>
            <div className="min-w-0 flex-1 basis-52">
              <div className="font-sans text-[16px] font-bold leading-tight" style={{ fontVariationSettings: '"opsz" 32' }}>{a.title}</div>
              <div className="text-[13px] text-muted">{a.description}</div>
            </div>
            <span className="num text-xs text-gold">{rewardLabel(a.reward)}</span>
          </li>
        ))}
        {rows.todo.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 opacity-75">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">·</span>
            <div className="min-w-0 flex-1 basis-52">
              <div className="font-sans text-[16px] font-bold leading-tight text-muted" style={{ fontVariationSettings: '"opsz" 32' }}>{a.title}</div>
              <div className="text-[13px] text-muted">{a.description}</div>
            </div>
            <span className="num text-xs text-muted">{rewardLabel(a.reward)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
