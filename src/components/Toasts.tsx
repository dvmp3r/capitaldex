import { useEffect, useState } from "react";
import { useGame, type Toast } from "../store/gameStore";

/** Avisos breves abajo a la izquierda: hitos, nuevas empresas, titulares comprados. */
export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const remove = useGame((s) => s.removeToast);
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-30 flex w-[min(340px,calc(100vw-32px))] flex-col gap-2">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onDone={() => remove(t.id)} />)}
    </div>
  );
}

const TONE: Record<Toast["kind"], string> = {
  info: "border-line bg-surface text-ink",
  gold: "border-gold/40 bg-[oklch(0.84_0.15_88/0.12)] text-gold",
  up: "border-up/40 bg-up-soft text-up",
};

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const a = window.setTimeout(() => setLeaving(true), 3200);
    const b = window.setTimeout(onDone, 3500);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [onDone]);
  return (
    <div className={`toast ${leaving ? "is-leaving" : ""} rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-[0_16px_32px_-16px_oklch(0_0_0/0.9)] ${TONE[toast.kind]}`} role="status">
      {toast.text}
    </div>
  );
}
