import { useEffect, useRef, useState } from "react";
import { saveFilename } from "../game/save";
import { useGame } from "../store/gameStore";

/** Menú de partida: exportar, importar y reiniciar. */
export function SaveMenu() {
  const exportSave = useGame((s) => s.exportSave);
  const importSave = useGame((s) => s.importSave);
  const reset = useGame((s) => s.reset);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const file = useRef<HTMLInputElement>(null);

  // El aviso desaparece solo y el menú se cierra al pulsar fuera.
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 4500);
    return () => window.clearTimeout(t);
  }, [msg]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (details.current?.open && !details.current.contains(e.target as Node)) details.current.open = false;
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const close = () => {
    if (details.current) details.current.open = false;
  };

  const onExport = () => {
    const blob = new Blob([exportSave()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = saveFilename();
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ text: "Partida exportada.", ok: true });
    close();
  };

  const onImportFile = async (f: File | undefined) => {
    if (!f) return;
    const r = importSave(await f.text());
    setMsg(r.ok ? { text: "Partida importada.", ok: true } : { text: r.error, ok: false });
    if (file.current) file.current.value = "";
    close();
  };

  const onReset = () => {
    close();
    if (window.confirm("¿Borrar la partida? No se puede deshacer. Exporta antes si quieres conservarla.")) {
      reset();
      setMsg({ text: "Partida reiniciada.", ok: true });
    }
  };

  const item = "block w-full px-3 py-2 text-left text-sm hover:bg-surface";

  return (
    <div className="relative">
      <details ref={details} className="group">
        <summary className="btn-ghost flex h-9 cursor-pointer list-none items-center gap-1.5 px-3 text-sm sm:h-10 [&::-webkit-details-marker]:hidden" aria-label="Menú de partida">
          <span className="hidden sm:inline">Partida</span>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="transition-transform group-open:rotate-180">
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-56 overflow-hidden rounded-xl border border-line bg-bg py-1 shadow-[0_12px_32px_-12px_oklch(0_0_0/0.3)]">
          <button className={item} onClick={onExport}>Exportar partida</button>
          <button className={item} onClick={() => file.current?.click()}>Importar partida…</button>
          <div className="my-1 border-t border-line" />
          <button className={`${item} text-brand`} onClick={onReset}>Reiniciar partida</button>
        </div>
      </details>
      <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImportFile(e.target.files?.[0])} />
      {msg && (
        <div role="status" className={`rise absolute right-0 top-[calc(100%+6px)] z-30 whitespace-nowrap rounded-lg px-3 py-2 text-sm shadow ${msg.ok ? "bg-up-soft text-up" : "bg-brand-soft text-brand-strong"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
