import { useState } from "react";
import { FREE_PULLS, GACHA_ODDS, PITY_EPIC, PITY_LEGENDARY } from "../game/balance";
import { fmtCapital, fmtPct } from "../game/format";
import { pullCost } from "../game/gacha";
import { RARITY_LABEL } from "../game/rarity";
import { RARITIES } from "../game/types";
import { useGame } from "../store/gameStore";
import { CompanyCard, RARITY_INK } from "./CompanyCard";

export function GachaPanel() {
  const capital = useGame((s) => s.capital);
  const gacha = useGame((s) => s.gacha);
  const lastPull = useGame((s) => s.lastPull);
  const openPack = useGame((s) => s.openPack);
  const [revealKey, setRevealKey] = useState(0);

  const cost = pullCost(gacha.pulls);
  const freeLeft = Math.max(0, FREE_PULLS - gacha.pulls);
  const canAfford = capital >= cost;

  const onOpen = () => {
    if (openPack()) setRevealKey((k) => k + 1);
  };

  return (
    <section aria-labelledby="cartera-h">
      <div className="flex items-baseline justify-between">
        <h2 id="cartera-h" className="text-lg font-bold">Cartera</h2>
        <span className="num text-xs text-muted">{gacha.pulls} abiertas</span>
      </div>

      {/* La carta: dorso antes de abrir, volteo al abrir. */}
      <div className="flip-scene mx-auto mt-3 w-full max-w-[280px]">
        {lastPull ? (
          <div key={revealKey} className="flip-inner">
            <div className="flip-face">
              <CompanyCard company={lastPull.company} shares={lastPull.shares} size="lg" />
            </div>
            <div className="flip-face flip-back">
              <CardBack />
            </div>
          </div>
        ) : (
          <button type="button" onClick={onOpen} disabled={!canAfford} className="w-full text-left disabled:cursor-not-allowed" aria-label="Abrir cartera">
            <CardBack ready={canAfford} />
          </button>
        )}
      </div>

      {lastPull && (
        <p key={`msg-${revealKey}`} className="rise mt-3 text-center text-sm">
          {lastPull.isNew ? (
            <span className="font-bold text-brand">Nueva empresa</span>
          ) : (
            <span className="font-semibold">+1 acción <span className="num text-muted">({lastPull.shares} en total)</span></span>
          )}
          {lastPull.pity && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">garantizada</span>}
        </p>
      )}

      <button onClick={onOpen} disabled={!canAfford} className="btn-primary mt-3 flex h-12 w-full items-center justify-between px-4 text-[15px]">
        <span>{lastPull ? "Abrir otra" : "Abrir cartera"}</span>
        <span className="num text-sm font-semibold opacity-90">
          {freeLeft > 0 ? `gratis · ${freeLeft}` : canAfford ? fmtCapital(cost) : `faltan ${fmtCapital(cost - capital)}`}
        </span>
      </button>

      <div className="mt-4 space-y-2.5">
        <Pity label="Épica garantizada" left={PITY_EPIC - gacha.sinceEpic} total={PITY_EPIC} color="var(--color-epica)" />
        <Pity label="Legendaria garantizada" left={PITY_LEGENDARY - gacha.sinceLegendary} total={PITY_LEGENDARY} color="var(--color-legendaria)" />
      </div>

      <details className="mt-4 text-xs text-muted">
        <summary className="cursor-pointer select-none font-medium hover:text-ink">Probabilidades por cartera</summary>
        <ul className="num mt-2 space-y-1">
          {[...RARITIES].reverse().map((r) => (
            <li key={r} className="flex justify-between">
              <span className={`font-sans font-semibold ${RARITY_INK[r]}`}>{RARITY_LABEL[r]}</span>
              <span>{fmtPct(GACHA_ODDS[r], 0)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 leading-snug">
          Misma probabilidad para todas las empresas de una rareza. Las carteras solo se abren con capital del juego.
        </p>
      </details>
    </section>
  );
}

function CardBack({ ready = false }: { ready?: boolean }) {
  return (
    <div className={`card-back ${ready ? "card-back-ready" : ""}`} aria-hidden="true">
      <div className="text-center">
        <div className="font-sans text-[28px] font-extrabold tracking-tight" style={{ fontVariationSettings: '"opsz" 96' }}>
          Capital<span className="opacity-70">Dex</span>
        </div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] opacity-80">cartera</div>
      </div>
    </div>
  );
}

function Pity({ label, left, total, color }: { label: string; left: number; total: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="num font-medium">en {left}</span>
      </div>
      <div className="meter mt-1">
        <i style={{ width: `${((total - left) / total) * 100}%`, background: color }} />
      </div>
    </div>
  );
}
