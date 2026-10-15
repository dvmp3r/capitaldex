import { useMemo, useState } from "react";
import { COMPANIES, SECTORS } from "../data/companies";
import { companyIncome } from "../game/economy";
import { RARITY_LABEL, RARITY_RANK, rarityOf } from "../game/rarity";
import { RARITIES, type Rarity } from "../game/types";
import { useGame } from "../store/gameStore";
import { CompanyCard } from "./CompanyCard";
import { IndexSets } from "./IndexSets";

type Sort = "cap" | "income" | "shares" | "name";

export function Collection() {
  const holdings = useGame((s) => s.holdings);
  const [rarity, setRarity] = useState<Rarity | "">("");
  const [index, setIndex] = useState("");
  const [sector, setSector] = useState("");
  const [query, setQuery] = useState("");
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [sort, setSort] = useState<Sort>("cap");

  const owned = Object.keys(holdings).length;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = COMPANIES.filter((c) => {
      if (rarity && rarityOf(c) !== rarity) return false;
      if (index && !c.indices.includes(index)) return false;
      if (sector && c.sector !== sector) return false;
      if (onlyOwned && !holdings[c.id]) return false;
      if (q && !(c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))) return false;
      return true;
    });
    const shares = (id: string) => holdings[id]?.shares ?? 0;
    const sorters: Record<Sort, (a: (typeof COMPANIES)[number], b: (typeof COMPANIES)[number]) => number> = {
      cap: (a, b) => b.marketCapUsd - a.marketCapUsd,
      income: (a, b) => companyIncome(b, shares(b.id)) - companyIncome(a, shares(a.id)),
      shares: (a, b) => shares(b.id) - shares(a.id) || RARITY_RANK[rarityOf(b)] - RARITY_RANK[rarityOf(a)],
      name: (a, b) => a.name.localeCompare(b.name, "es"),
    };
    return [...filtered].sort(sorters[sort]);
  }, [holdings, rarity, index, sector, query, onlyOwned, sort]);

  const ownedInList = list.filter((c) => holdings[c.id]).length;

  return (
    <section aria-labelledby="coleccion-h" className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="coleccion-h" className="text-lg font-bold">Colección</h2>
        <span className="num text-sm text-muted">
          {owned} de {COMPANIES.length} descubiertas
        </span>
      </div>

      <div className="mt-3">
        <IndexSets active={index} onSelect={setIndex} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ticker o nombre" className="control w-48" aria-label="Buscar" />
        <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | "")} className="control" aria-label="Rareza">
          <option value="">Cualquier rareza</option>
          {[...RARITIES].reverse().map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
        </select>
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="control" aria-label="Sector">
          <option value="">Cualquier sector</option>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="control" aria-label="Orden">
          <option value="cap">Capitalización</option>
          <option value="income">Ingresos</option>
          <option value="shares">Acciones</option>
          <option value="name">Nombre</option>
        </select>
        <label className="ml-auto flex cursor-pointer select-none items-center gap-2 text-[13px]">
          <span className={onlyOwned ? "font-semibold" : "text-muted"}>Solo mías</span>
          <input type="checkbox" className="peer sr-only" checked={onlyOwned} onChange={(e) => setOnlyOwned(e.target.checked)} />
          <span className="relative h-5 w-9 rounded-full bg-line-strong transition-colors peer-checked:bg-brand peer-focus-visible:ring-3 peer-focus-visible:ring-brand-soft after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-bg after:shadow after:transition-transform peer-checked:after:translate-x-4" />
        </label>
      </div>

      {list.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-line-strong p-8 text-center">
          <p className="font-semibold">Nada con esos filtros</p>
          <p className="mt-1 text-sm text-muted">{onlyOwned ? "Abre carteras para descubrir empresas de este grupo." : "Prueba con otro índice, sector o rareza."}</p>
        </div>
      ) : (
        <>
          <p className="num mt-4 text-xs text-muted">{ownedInList} de {list.length} en esta vista</p>
          <div className="mt-2 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
            {list.map((c) => {
              const shares = holdings[c.id]?.shares ?? 0;
              return <CompanyCard key={c.id} company={c} shares={shares} hidden={shares === 0} interactive={shares > 0} />;
            })}
          </div>
        </>
      )}
    </section>
  );
}
