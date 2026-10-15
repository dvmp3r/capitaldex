import { useEffect, useState } from "react";
import { fmtCapital } from "../game/format";
import { fetchLeaderboard, type LeaderboardRow } from "../lib/cloud";
import { t } from "../i18n";
import { useCloud } from "../store/cloudStore";
import { useGame } from "../store/gameStore";

/** Ranking mundial por capital generado. Se lee de la vista pública `leaderboard`. */
export function Ranking() {
  const enabled = useCloud((s) => s.enabled);
  const user = useCloud((s) => s.user);
  const lastSyncAt = useCloud((s) => s.lastSyncAt);
  const totalEarned = useGame((s) => s.totalEarned);
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchLeaderboard()
      .then((r) => alive && setRows(r))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [enabled, lastSyncAt]);

  if (!enabled) return <p className="text-sm text-muted">{t("ranking.disabled")}</p>;

  const myIndex = rows?.findIndex((r) => r.username === user?.username) ?? -1;

  return (
    <section aria-labelledby="ranking-h" className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="ranking-h" className="text-lg font-bold">{t("ranking.title")}</h2>
        <span className="num text-sm text-muted">{t("ranking.subtitle")}</span>
      </div>
      {!user && <p className="mt-2 text-sm text-muted">{t("ranking.needAccount")}</p>}
      {user && myIndex === -1 && rows && <p className="mt-2 text-sm text-muted">{t("ranking.notYet", { n: fmtCapital(totalEarned) })}</p>}
      {error && <p className="mt-2 text-sm text-[oklch(0.75_0.17_25)]">{error}</p>}
      {rows === null && !error && <p className="mt-4 text-sm text-muted">…</p>}
      {rows && rows.length === 0 && <p className="mt-4 text-sm text-muted">{t("ranking.empty")}</p>}
      {rows && rows.length > 0 && (
        <ol className="mt-4 divide-y divide-line">
          {rows.map((r, i) => {
            const me = r.username === user?.username;
            return (
              <li key={r.username} className={`flex items-center gap-3 py-2.5 ${me ? "rounded-lg bg-gold/10 px-2 -mx-2" : ""}`}>
                <span className={`num w-8 text-right text-sm ${i < 3 ? "font-bold text-gold" : "text-muted"}`}>{i + 1}</span>
                <span className={`min-w-0 flex-1 truncate font-semibold ${me ? "text-gold" : ""}`}>{r.username}</span>
                <span className="num text-xs text-muted">{r.companies} {t("ranking.companies")}</span>
                <span className="num w-24 text-right text-sm font-bold">{fmtCapital(r.total_earned)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
