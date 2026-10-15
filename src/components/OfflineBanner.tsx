import { fmtCapital, fmtDuration } from "../game/format";
import { useGame } from "../store/gameStore";

/** Aviso de progreso offline. En línea, bajo la cabecera; no bloquea nada. */
export function OfflineBanner() {
  const offline = useGame((s) => s.offline);
  const dismiss = useGame((s) => s.dismissOffline);
  if (!offline) return null;

  return (
    <div className="rise mx-auto mt-4 flex max-w-7xl items-center gap-3 rounded-xl bg-up-soft px-4 py-3 text-sm" role="status">
      <span>
        Mientras no estabas (<span className="num">{fmtDuration(offline.seconds)}</span>) tus empresas generaron{" "}
        <strong className="num text-up">+{fmtCapital(offline.earned)}</strong>.
      </span>
      <button onClick={dismiss} className="btn-ghost ml-auto h-8 shrink-0 px-3 text-xs">
        Entendido
      </button>
    </div>
  );
}
