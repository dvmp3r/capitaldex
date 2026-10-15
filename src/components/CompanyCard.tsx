import { countryName } from "../data/companies";
import { companyIncome, nextMilestone } from "../game/economy";
import { flag, fmt, fmtPct, fmtUsd } from "../game/format";
import { rarityLabel, rarityOf } from "../game/rarity";
import { sectorColor } from "../game/sectors";
import type { Company, Rarity } from "../game/types";
import { t } from "../i18n";
import { CardArt } from "./CardArt";

export const RARITY_INK: Record<Rarity, string> = {
  comun: "text-comun-ink",
  poco_comun: "text-poco_comun-ink",
  rara: "text-rara-ink",
  epica: "text-epica-ink",
  legendaria: "text-legendaria-ink",
};

interface Props {
  company: Company;
  shares?: number;
  /** Carta no descubierta: silueta. */
  hidden?: boolean;
  size?: "sm" | "lg";
  interactive?: boolean;
  className?: string;
}

export function CompanyCard({ company, shares = 0, hidden = false, size = "lg", interactive = false, className = "" }: Props) {
  const rarity = rarityOf(company);
  const big = size === "lg";
  const ticker = company.id.replace(/\.[A-Z]+$/, "");
  const next = nextMilestone(shares);

  return (
    <article
      data-rarity={rarity}
      className={`card ${hidden ? "is-hidden" : ""} ${interactive ? "card-interactive" : ""} ${className}`}
      aria-label={hidden ? t("card.undiscoveredAria", { rarity: rarityLabel(rarity), sector: company.sector }) : `${company.name}, ${rarityLabel(rarity)}`}
    >
      {/* Cabecera: ticker + país */}
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`font-sans font-extrabold leading-none tracking-tight ${big ? "text-[40px]" : "text-[22px]"}`} style={{ fontVariationSettings: '"opsz" 96' }}>
            {hidden ? t("card.unknown") : ticker}
          </div>
          <div className={`mt-1 truncate ${big ? "text-sm" : "text-[11px]"} ${hidden ? "text-muted" : "text-ink/80"}`} title={hidden ? undefined : company.name}>
            {hidden ? t("card.undiscovered") : company.name}
          </div>
        </div>
        <span className="num shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[10px] font-medium text-muted" title={countryName(company.countryCode)}>
          {flag(company.countryCode)}
        </span>
      </header>

      {/* Arte */}
      <div className={`relative mt-2 min-h-0 flex-1 overflow-hidden rounded-lg ${hidden ? "bg-surface-2" : "bg-surface"}`}>
        <CardArt seed={company.id} sector={company.sector} />
        <span className={`absolute left-2 top-1.5 inline-flex items-center gap-1 rounded-full bg-bg/90 px-1.5 py-0.5 text-[10px] font-semibold ${hidden ? "text-muted" : "text-ink/80"}`}>
          <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: sectorColor(company.sector) }} />
          {company.sector}
        </span>
      </div>

      {/* Pie: rareza + datos */}
      <footer className="mt-2">
        <div className="flex items-baseline justify-between">
          <span className={`text-[11px] font-bold uppercase tracking-wide ${RARITY_INK[rarity]}`}>{rarityLabel(rarity)}</span>
          {!hidden && <span className="num text-[11px] text-muted">{t("card.cap")} {fmtUsd(company.marketCapUsd)}</span>}
        </div>

        {!hidden && big && (
          <dl className="num mt-2 grid grid-cols-3 gap-2 border-t border-line pt-2 text-[11px]">
            <div><dt className="text-muted">{t("card.revenue")}</dt><dd className="font-medium">{fmtUsd(company.revenueUsd)}</dd></div>
            <div><dt className="text-muted">{t("card.pe")}</dt><dd className="font-medium">{company.pe ? company.pe.toFixed(1) : "–"}</dd></div>
            <div><dt className="text-muted">{t("card.dividend")}</dt><dd className="font-medium">{fmtPct(company.dividendYield)}</dd></div>
          </dl>
        )}

        {shares > 0 && (
          <div className={`num mt-2 flex items-end justify-between border-t border-line pt-2 ${big ? "text-sm" : "text-[12px]"}`}>
            <div>
              <span className="text-muted">{t("card.shares")} </span>
              <span className="font-bold">{shares}</span>
              {next && <span className="ml-1 text-[10px] text-muted">/ {next.shares} → ×{next.mult}</span>}
            </div>
            <div className="font-bold text-up">+{fmt(companyIncome(company, shares))}/s</div>
          </div>
        )}
      </footer>
    </article>
  );
}
