import { useMemo } from "react";
import { ACHIEVEMENTS, progressOf, rewardLabel, type Achievement } from "../game/achievements";
import { fmt } from "../game/format";
import { t } from "../i18n";
import { achievementContextOf, useGame } from "../store/gameStore";

/** Pestaña Logros: progreso global, el objetivo más cercano y cuadrícula de logros con su avance. */
export function Achievements() {
  const unlocked = useGame((s) => s.achievements);
  const holdings = useGame((s) => s.holdings);
  const gacha = useGame((s) => s.gacha);
  const totalEarned = useGame((s) => s.totalEarned);
  const stats = useGame((s) => s.stats);
  const upgrades = useGame((s) => s.upgrades);

  const ctx = useMemo(() => achievementContextOf({ holdings, gacha, totalEarned, stats, upgrades }), [holdings, gacha, totalEarned, stats, upgrades]);
  const have = useMemo(() => new Set(unlocked), [unlocked]);

  const { done, pending } = useMemo(() => {
    const done = ACHIEVEMENTS.filter((a) => have.has(a.id));
    const pending = ACHIEVEMENTS.filter((a) => !have.has(a.id))
      .map((a) => ({ a, p: progressOf(a, ctx) }))
      .sort((x, y) => y.p - x.p || x.a.target - y.a.target);
    return { done, pending };
  }, [have, ctx]);

  const pct = Math.round((done.length / ACHIEVEMENTS.length) * 100);
  const next = pending[0];

  return (
    <section aria-labelledby="logros-h" className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="logros-h" className="text-lg font-bold">{t("achievements.title")}</h2>
        <span className="num text-sm text-muted">{t("achievements.count", { n: done.length, total: ACHIEVEMENTS.length })}</span>
      </div>
      <p className="mt-1 max-w-[60ch] text-sm text-muted [text-wrap:pretty]">{t("achievements.intro")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="flex items-baseline justify-between text-[12px] font-semibold text-muted">
            <span>{t("achievements.progress")}</span>
            <span className="num text-ink">{pct} %</span>
          </div>
          <div className="meter mt-2">
            <i style={{ width: `${pct}%`, background: "var(--color-gold)" }} />
          </div>
        </div>
        {next && (
          <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
            <Ring p={next.p} />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-gold">{t("achievements.next")}</div>
              <div className="truncate font-sans text-[15px] font-bold leading-tight" style={{ fontVariationSettings: '"opsz" 32' }}>{next.a.title}</div>
              <div className="num text-[12px] text-muted">{fmt(next.a.metric(ctx))} / {fmt(next.a.target)}</div>
            </div>
          </div>
        )}
      </div>

      <h3 className="mt-6 text-[12px] font-semibold text-muted">{t("achievements.pending")} <span className="num">({pending.length})</span></h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {pending.map(({ a, p }) => <Tile key={a.id} a={a} p={p} current={a.metric(ctx)} />)}
      </ul>

      {done.length > 0 && (
        <>
          <h3 className="mt-6 text-[12px] font-semibold text-muted">{t("achievements.done")} <span className="num">({done.length})</span></h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {done.map((a) => <Tile key={a.id} a={a} p={1} current={a.target} done />)}
          </ul>
        </>
      )}
    </section>
  );
}

function Tile({ a, p, current, done = false }: { a: Achievement; p: number; current: number; done?: boolean }) {
  return (
    <li className={`flex gap-3 rounded-xl border p-3 ${done ? "border-gold/35 bg-gold/[0.06]" : "border-line bg-surface"}`}>
      {done ? (
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-bg text-base font-black">✓</span>
      ) : (
        <Ring p={p} />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-sans text-[15px] font-bold leading-tight" style={{ fontVariationSettings: '"opsz" 32' }}>{a.title}</div>
        <div className="mt-0.5 text-[12.5px] text-muted [text-wrap:pretty]">{a.description}</div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`num rounded-full px-2 py-0.5 text-[11px] font-semibold ${done ? "bg-gold/15 text-gold" : "bg-surface-2 text-ink/80"}`}>{rewardLabel(a.reward)}</span>
          {!done && <span className="num text-[11px] text-muted">{fmt(current)} / {fmt(a.target)}</span>}
        </div>
        {!done && (
          <div className="meter mt-2">
            <i style={{ width: `${Math.round(p * 100)}%`, background: p >= 0.5 ? "var(--color-gold)" : "var(--color-line-strong)" }} />
          </div>
        )}
      </div>
    </li>
  );
}

/** Anillo de progreso (gradiente cónico) con el porcentaje dentro. */
function Ring({ p }: { p: number }) {
  const pct = Math.round(p * 100);
  return (
    <span aria-hidden className="ring num shrink-0" style={{ "--p": pct } as React.CSSProperties}>
      <span>{pct}</span>
    </span>
  );
}
