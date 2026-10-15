import { INDEX_MEMBERS } from "../data/companies";
import { setProgress } from "../game/economy";
import { fmtMult } from "../game/format";
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
    <div className="-mx-4 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Índices">
      <div className="flex min-w-max gap-2">
        <Chip label="Todas" active={active === ""} onClick={() => onSelect("")} />
        {sets.map((s) => {
          const frac = s.total ? s.owned / s.total : 0;
          const done = frac === 1;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={active === s.id}
              onClick={() => onSelect(active === s.id ? "" : s.id)}
              className={`rounded-lg border px-3 py-1.5 text-left transition-colors ${
                active === s.id ? "border-ink bg-ink text-bg" : "border-line bg-bg hover:bg-surface"
              }`}
              title={`${s.name}: ${s.owned} de ${s.total}. Bonus actual ${fmtMult(s.mult)}, máximo +${Math.round(s.bonus * 100)} %`}
            >
              <div className="flex items-baseline gap-2 text-[13px]">
                <span className={`font-semibold ${done && active !== s.id ? "text-legendaria-ink" : ""}`}>{s.name}</span>
                <span className={`num text-[11px] ${active === s.id ? "opacity-80" : "text-muted"}`}>{s.owned}/{s.total}</span>
              </div>
              <div className={`meter mt-1.5 ${active === s.id ? "bg-bg/20" : ""}`}>
                <i style={{ width: `${frac * 100}%`, background: done ? "var(--color-legendaria)" : active === s.id ? "var(--color-bg)" : "var(--color-brand)" }} />
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
