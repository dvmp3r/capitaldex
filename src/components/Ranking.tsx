import { Building2, RefreshCw, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fmtCapital } from "../game/format";
import { fetchLeaderboard, type LeaderboardRow } from "../lib/cloud";
import { t } from "../i18n";
import { useCloud } from "../store/cloudStore";
import { useGame } from "../store/gameStore";

const MEDAL = ["medal-gold", "medal-silver", "medal-bronze"];

/** Ranking mundial por capital generado. Se lee de la vista pública `leaderboard`. */
export function Ranking() {
  const enabled = useCloud((s) => s.enabled);
  const user = useCloud((s) => s.user);
  const lastSyncAt = useCloud((s) => s.lastSyncAt);
  const totalEarned = useGame((s) => s.lifetimeBase + s.totalEarned);
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!enabled) return;
    setLoading(true);
    fetchLeaderboard()
      .then((r) => {
        // Sin capital generado no se compite (también deja fuera cuentas de prueba vaciadas).
        setRows(r.filter((row) => row.total_earned > 0));
        setError(null);
        setUpdatedAt(Date.now());
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load, lastSyncAt]);

  if (!enabled) return <p className="text-sm text-muted">{t("ranking.disabled")}</p>;

  const myIndex = rows?.findIndex((r) => r.username === user?.username) ?? -1;
  const top = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];

  return (
    <section aria-labelledby="ranking-h" className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="ranking-h" className="text-lg font-bold">{t("ranking.title")}</h2>
        <span className="num text-sm text-muted">{t("ranking.subtitle")}</span>
        <button onClick={load} disabled={loading} className="btn-ghost ml-auto flex h-8 items-center gap-1.5 px-2.5 text-xs" title={t("ranking.refresh")}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          {updatedAt ? new Date(updatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : t("ranking.refresh")}
        </button>
      </div>

      {!user && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-gold/35 bg-gold/[0.08] px-4 py-3 text-sm">
          <Trophy size={18} className="shrink-0 text-gold" aria-hidden="true" />
          <span>{t("ranking.needAccount")}</span>
        </div>
      )}
      {user && myIndex === -1 && rows && <p className="mt-2 text-sm text-muted">{t("ranking.notYet", { n: fmtCapital(totalEarned) })}</p>}
      {error && <p className="mt-2 text-sm text-[oklch(0.75_0.17_25)]">{error}</p>}
      {rows === null && !error && <p className="mt-4 text-sm text-muted">{t("ranking.loading")}</p>}
      {rows && rows.length === 0 && <p className="mt-4 text-sm text-muted">{t("ranking.empty")}</p>}

      {top.length > 0 && (
        <ol className="mt-4 grid gap-2 sm:grid-cols-3">
          {top.map((r, i) => {
            const me = r.username === user?.username;
            return (
              <li key={r.username} className={`flex items-center gap-3 rounded-xl border p-3 ${me ? "border-gold/50 bg-gold/[0.08]" : "border-line bg-surface"} ${i === 0 ? "sm:order-2" : i === 1 ? "sm:order-1" : "sm:order-3"}`}>
                <span className={`medal num ${MEDAL[i]}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-[15px] font-bold leading-tight">{r.username}{me && <span className="ml-1.5 text-[11px] font-semibold text-gold">{t("ranking.you")}</span>}</div>
                  <div className="num mt-0.5 flex items-center gap-1 text-[11px] text-muted"><Building2 size={11} aria-hidden="true" />{r.companies} {t("ranking.companies")}</div>
                </div>
                <span className="num shrink-0 text-base font-bold">{fmtCapital(r.total_earned)}</span>
              </li>
            );
          })}
        </ol>
      )}

      {rest.length > 0 && (
        <ol className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
          {rest.map((r, i) => {
            const me = r.username === user?.username;
            return (
              <li key={r.username} className={`flex items-center gap-3 border-t border-line px-3 py-2.5 first:border-t-0 ${me ? "bg-gold/[0.08]" : ""}`}>
                <span className="num w-7 text-right text-sm text-muted">{i + 4}</span>
                <span className={`min-w-0 flex-1 truncate font-semibold ${me ? "text-gold" : ""}`}>{r.username}{me && <span className="ml-1.5 text-[11px] font-semibold text-gold">{t("ranking.you")}</span>}</span>
                <span className="num hidden items-center gap-1 text-xs text-muted sm:flex"><Building2 size={11} aria-hidden="true" />{r.companies}</span>
                <span className="num w-24 text-right text-sm font-bold">{fmtCapital(r.total_earned)}</span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 text-[11px] text-muted">{t("ranking.note")}</p>
    </section>
  );
}
