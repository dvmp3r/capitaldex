import { INDEX_MEMBERS } from "../data/companies";
import { setProgress } from "../game/economy";
import { fmtMult } from "../game/format";
import { t } from "../i18n";
import { useGame } from "../store/gameStore";

interface Props {
  active: string;
  onSelect: (id: string) => void;
}

/** Fila de índices: progreso de cada set y filtro de la colección a la vez. */
export function IndexSets({ active, onSelect }: Props) {
  const holdings = useGame((s) => s.holdings);
  const sets = setProgress(holdings, INDEX_MEMBERS);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1" role="tablist" aria-label={t("sets.aria")}>
      <div className="flex min-w-max gap-2">
        <Chip label={t("sets.all")} active={active === ""} onClick={() => onSelect("")} />
        {sets.map((s) => {
          const frac = s.total ? s.owned / s.total : 0;
          const done = frac === 1;
          const selected = active === s.id;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(selected ? "" : s.id)}
              className={`rounded-lg border px-3 py-1.5 text-left transition-colors ${selected ? "border-ink bg-ink text-bg" : "border-line bg-bg hover:bg-surface"}`}
              title={t("sets.title", { name: s.name, owned: s.owned, total: s.total, mult: fmtMult(s.mult), bonus: Math.round(s.bonus * 100) })}
            >
              <div className="flex items-baseline gap-2 text-[13px]">
                <span className={`font-semibold ${done && !selected ? "text-legendaria-ink" : ""}`}>{s.name}</span>
                <span className={`num text-[11px] ${selected ? "opacity-80" : "text-muted"}`}>{s.owned}/{s.total}</span>
              </div>
              <div className={`meter mt-1.5 ${selected ? "bg-bg/20" : ""}`}>
                <i style={{ width: `${frac * 100}%`, background: done ? "var(--color-legendaria)" : selected ? "var(--color-bg)" : "var(--color-brand)" }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-lg border px-3 text-[13px] font-semibold transition-colors ${active ? "border-ink bg-ink text-bg" : "border-line bg-bg hover:bg-surface"}`}
    >
      {label}
    </button>
  );
}
