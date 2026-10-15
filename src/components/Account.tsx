import { useEffect, useRef, useState } from "react";
import { USERNAME_RE } from "../lib/cloud";
import { t } from "../i18n";
import { useCloud } from "../store/cloudStore";

/** Cuenta en la nube: entrar o registrarse con nombre y contraseña; guardado automático. */
export function Account() {
  const enabled = useCloud((s) => s.enabled);
  const user = useCloud((s) => s.user);
  const busy = useCloud((s) => s.busy);
  const error = useCloud((s) => s.error);
  const lastSyncAt = useCloud((s) => s.lastSyncAt);
  const { init, register, login, logout, sync } = useCloud.getState();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void init();
  }, [init]);

  // Guardado automático cada 60 s mientras hay sesión, y al cerrar la pestaña.
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => void sync(), 60_000);
    const onHide = () => {
      if (document.visibilityState === "hidden") void sync();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [user, sync]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (open && box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!enabled) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = mode === "login" ? await login(username.trim(), password) : await register(username.trim(), password);
    if (ok) {
      setOpen(false);
      setPassword("");
    }
  };

  const valid = USERNAME_RE.test(username.trim()) && password.length >= 6;

  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost flex h-9 items-center gap-1.5 px-3 text-sm sm:h-10" aria-expanded={open}>
        <span className={`inline-block h-2 w-2 rounded-full ${user ? "bg-up" : "bg-line-strong"}`} />
        <span className="hidden sm:inline">{user ? user.username : t("account.enter")}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-72 rounded-xl border border-line bg-bg p-4 shadow-[0_12px_32px_-12px_oklch(0_0_0/0.9)]">
          {user ? (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[11px] font-semibold text-muted">{t("account.loggedAs")}</div>
                <div className="font-bold">{user.username}</div>
              </div>
              <div className="text-xs text-muted">
                {lastSyncAt ? t("account.lastSync", { time: new Date(lastSyncAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) }) : t("account.notSynced")}
              </div>
              {error && <div className="text-xs text-[oklch(0.75_0.17_25)]">{error}</div>}
              <div className="flex gap-2">
                <button onClick={() => void sync()} disabled={busy} className="btn-primary h-9 flex-1 text-sm">{t("account.saveNow")}</button>
                <button onClick={() => void logout()} disabled={busy} className="btn-ghost h-9 px-3 text-sm">{t("account.logout")}</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="flex gap-1 rounded-lg bg-surface p-1 text-sm">
                <button type="button" onClick={() => setMode("login")} className={`h-8 flex-1 rounded-md font-semibold ${mode === "login" ? "bg-ink text-bg" : "text-muted"}`}>{t("account.login")}</button>
                <button type="button" onClick={() => setMode("register")} className={`h-8 flex-1 rounded-md font-semibold ${mode === "register" ? "bg-ink text-bg" : "text-muted"}`}>{t("account.register")}</button>
              </div>
              <input id="account-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("account.username")} autoComplete="username" className="control w-full" />
              <input id="account-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("account.password")} autoComplete={mode === "login" ? "current-password" : "new-password"} className="control w-full" />
              <p className="text-[11px] leading-snug text-muted">{mode === "register" ? t("account.registerHint") : t("account.loginHint")}</p>
              {error && <div className="text-xs text-[oklch(0.75_0.17_25)]">{error}</div>}
              <button type="submit" disabled={!valid || busy} className="btn-primary h-10 w-full text-sm">
                {busy ? "…" : mode === "login" ? t("account.login") : t("account.createAccount")}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
