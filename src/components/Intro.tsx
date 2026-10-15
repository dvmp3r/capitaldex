import { useState } from "react";
import { COMPANIES, POOL } from "../data/companies";
import { FREE_PULLS, GACHA_ODDS } from "../game/balance";
import { fmtCapital, fmtPct } from "../game/format";
import { pullCost } from "../game/gacha";
import { rarityLabel } from "../game/rarity";
import { RARITIES } from "../game/types";
import { t } from "../i18n";
import { USERNAME_RE } from "../lib/cloud";
import { useCloud } from "../store/cloudStore";
import { useGame, useMults } from "../store/gameStore";
import { GachaStage, type StagePhase } from "./GachaStage";
import { Wordmark } from "./Logo";

/**
 * Primera vez: pantalla a toda página con la máquina en el centro y las carteras gratis.
 * Se muestra mientras `settings.introSeen` sea falso; el menú permite volver a verla.
 * En móvil el orden es título → máquina → texto y botones; en escritorio, texto a la izquierda y máquina a la derecha.
 */
export function Intro() {
  const introSeen = useGame((s) => s.settings.introSeen);
  const setSetting = useGame((s) => s.setSetting);
  const capital = useGame((s) => s.capital);
  const gacha = useGame((s) => s.gacha);
  const lastPull = useGame((s) => s.lastPull);
  const openPack = useGame((s) => s.openPack);
  const freePulls = useGame((s) => s.freePulls);
  const mults = useMults();
  const revealKey = useGame((s) => s.pullSeq);
  const [startSeq] = useState(() => useGame.getState().pullSeq);
  const [phase, setPhase] = useState<StagePhase>("idle");
  const [closing, setClosing] = useState(false);
  // Primer paso: cuenta o invitado (solo si la nube está disponible y aún no hay sesión).
  const cloudEnabled = useCloud((s) => s.enabled);
  const user = useCloud((s) => s.user);
  const [step, setStep] = useState<"account" | "play">(() => (useCloud.getState().enabled && !useCloud.getState().user ? "account" : "play"));

  if (introSeen) return null;
  const showAccount = step === "account" && cloudEnabled && !user;

  const freeLeft = Math.max(0, FREE_PULLS - gacha.pulls) + freePulls;
  const cost = freeLeft > 0 ? 0 : pullCost(gacha.pulls, mults.gachaCost);
  const canAfford = capital >= cost;
  const busy = phase === "turning" || phase === "dropping" || phase === "opening";
  const pulledHere = revealKey - startSeq; // tiradas hechas dentro de la intro

  const onOpen = () => {
    if (busy) return;
    openPack();
  };

  const finish = () => {
    setClosing(true);
    window.setTimeout(() => setSetting("introSeen", true), 420);
  };

  const primary = "h-14 rounded-xl bg-white px-6 text-lg font-bold text-bg shadow-[0_16px_40px_-14px_oklch(1_0_0/0.45)] transition hover:brightness-95 active:scale-[0.98] disabled:opacity-60";
  const secondary = "h-14 rounded-xl border border-white/40 px-5 text-base font-semibold text-white transition hover:bg-white/10 disabled:opacity-40";

  return (
    <div className={`intro fixed inset-0 z-40 overflow-y-auto text-white ${closing ? "intro-out" : ""}`} role="dialog" aria-labelledby="intro-h">
      <button onClick={finish} className="absolute right-4 top-4 z-10 rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">
        {t("intro.skip")}
      </button>

      <div className="mx-auto grid min-h-full max-w-6xl content-center gap-x-16 gap-y-6 px-6 pb-12 pt-14 md:grid-cols-[1fr_minmax(280px,360px)] md:grid-rows-[auto_auto] md:py-10">
        {/* A: marca y titular */}
        <div className="intro-in md:self-end">
          <Wordmark size={20} />
          <h1 id="intro-h" className="mt-4 font-sans text-[clamp(44px,7.5vw,88px)] font-extrabold leading-[0.92] tracking-[-0.03em]" style={{ fontVariationSettings: '"opsz" 96' }}>
            {t("intro.title")}
          </h1>
        </div>

        {/* B: la máquina */}
        <div className="intro-in-3 mx-auto w-full max-w-[250px] sm:max-w-[300px] md:col-start-2 md:row-span-2 md:row-start-1 md:max-w-none md:self-center">
          <GachaStage result={lastPull} revealKey={revealKey} onPull={onOpen} pullEnabled={canAfford} onPhase={setPhase} />
        </div>

        {/* C: explicación, leyenda y botones (o el paso de cuenta) */}
        <div className="intro-in-2 md:col-start-1 md:self-start">
          <p className="max-w-[38ch] text-[17px] leading-relaxed text-white/90 [text-wrap:pretty] md:text-lg">
            {t("intro.lead", { n: COMPANIES.length, legendary: POOL.legendaria.length })}
          </p>

          {showAccount ? (
            <AccountStep onDone={() => setStep("play")} />
          ) : (
          <>

          <div className="mt-6">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-white/70">{t("intro.legend")}</div>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {[...RARITIES].reverse().map((r) => (
                <li key={r} className="flex items-center gap-2 text-sm">
                  <svg width="18" height="18" viewBox="-10 -10 20 20" aria-hidden="true">
                    <path d="M -9 0 A 9 9 0 0 1 9 0 Z" fill={`var(--color-${r})`} />
                    <path d="M -9 0 A 9 9 0 0 0 9 0 Z" fill={`var(--color-${r})`} opacity="0.55" />
                  </svg>
                  <span className="font-semibold">{rarityLabel(r)}</span>
                  <span className="num text-white/70">{fmtPct(GACHA_ODDS[r], GACHA_ODDS[r] < 0.05 ? 1 : 0)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {pulledHere >= FREE_PULLS || freeLeft === 0 ? (
              <>
                <button onClick={finish} className={primary}>{t("intro.enter")}</button>
                <button onClick={onOpen} disabled={!canAfford || busy} className={secondary}>
                  {t("intro.next")} <span className="num opacity-80">· {freeLeft > 0 ? t("intro.free") : fmtCapital(cost)}</span>
                </button>
              </>
            ) : (
              <button onClick={onOpen} disabled={busy} className={primary}>
                {pulledHere === 0 ? t("intro.first") : t("intro.next")} <span className="num font-semibold opacity-70">· {t("intro.free")}</span>
              </button>
            )}
            <span className="num text-sm text-white/75">{t("intro.progress", { n: Math.min(FREE_PULLS, FREE_PULLS - freeLeft), total: FREE_PULLS })}</span>
          </div>

          {lastPull && phase === "revealed" && (
            <p key={`m-${revealKey}`} className="rise mt-4 text-base">
              {lastPull.rarity === "legendaria" ? (
                <span className="font-bold text-legendaria-ink">{t("gacha.legendary")}</span>
              ) : lastPull.isNew ? (
                <span className="font-bold">{t("gacha.newCompany")}: {lastPull.company.name}</span>
              ) : (
                <span className="font-semibold">{t("gacha.plusShare")} · {lastPull.company.name}</span>
              )}
            </p>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Paso de cuenta de la introducción: entrar, crear cuenta o seguir como invitado. */
function AccountStep({ onDone }: { onDone: () => void }) {
  const busy = useCloud((s) => s.busy);
  const error = useCloud((s) => s.error);
  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const valid = USERNAME_RE.test(username.trim()) && password.length >= 6;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { login, register } = useCloud.getState();
    const ok = mode === "login" ? await login(username.trim(), password) : await register(username.trim(), password);
    if (ok) onDone();
  };

  const field = "h-12 w-full rounded-xl border border-white/25 bg-white/10 px-4 text-base text-white placeholder:text-white/50 focus:border-white/70 focus:outline-none";

  return (
    <div className="mt-6 max-w-[440px] rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
      <div className="text-[12px] font-semibold uppercase tracking-wider text-white/70">{t("intro.accountTitle")}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-white/85 [text-wrap:pretty]">{t("intro.accountLead")}</p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="flex gap-1 rounded-xl bg-white/10 p-1 text-sm">
          <button type="button" onClick={() => setMode("register")} className={`h-9 flex-1 rounded-lg font-semibold transition ${mode === "register" ? "bg-white text-bg" : "text-white/80 hover:text-white"}`}>{t("account.register")}</button>
          <button type="button" onClick={() => setMode("login")} className={`h-9 flex-1 rounded-lg font-semibold transition ${mode === "login" ? "bg-white text-bg" : "text-white/80 hover:text-white"}`}>{t("account.login")}</button>
        </div>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("account.username")} autoComplete="username" className={field} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("account.password")} autoComplete={mode === "login" ? "current-password" : "new-password"} className={field} />
        <p className="text-[12px] leading-snug text-white/60">{mode === "register" ? t("intro.registerHint") : t("account.loginHint")}</p>
        {error && <p className="text-sm text-[oklch(0.8_0.15_25)]">{error}</p>}
        <button type="submit" disabled={!valid || busy} className="h-12 w-full rounded-xl bg-white text-base font-bold text-bg shadow-[0_16px_40px_-14px_oklch(1_0_0/0.45)] transition hover:brightness-95 active:scale-[0.98] disabled:opacity-50">
          {busy ? "…" : mode === "login" ? t("account.login") : t("account.createAccount")}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
        <button type="button" onClick={onDone} className="h-10 rounded-xl border border-white/35 px-4 text-sm font-semibold text-white transition hover:bg-white/10">
          {t("intro.guest")}
        </button>
        <span className="text-[12px] text-white/60">{t("intro.guestHint")}</span>
      </div>
    </div>
  );
}
