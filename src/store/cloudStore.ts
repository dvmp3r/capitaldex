import { create } from "zustand";
import { cloudEnabled, currentUser, pullSave, pushSave, signIn, signOut, signUp, type CloudUser } from "../lib/cloud";
import { cloudHooks, useGame } from "./gameStore";

/**
 * Estado de la cuenta y la sincronización con la nube.
 * Regla de fusión al entrar: se queda la partida con más capital generado en total (todas las partidas, nube o local).
 */
interface CloudState {
  enabled: boolean;
  user: CloudUser | null;
  busy: boolean;
  error: string | null;
  lastSyncAt: number | null;
  init: () => Promise<void>;
  register: (username: string, password: string) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  sync: () => Promise<void>;
}

async function mergeOnLogin(user: CloudUser) {
  const game = useGame.getState();
  const cloud = await pullSave(user.id);
  if (cloud) {
    const parsed = JSON.parse(cloud.saveText) as { data?: { totalEarned?: number; lifetimeBase?: number } };
    const cloudEarned = (parsed.data?.lifetimeBase ?? 0) + (parsed.data?.totalEarned ?? 0);
    if (cloudEarned > game.lifetimeBase + game.totalEarned) {
      const r = game.importSave(cloud.saveText);
      if (!r.ok) throw new Error(r.error);
      return;
    }
  }
  const g = useGame.getState();
  await pushSave(user.id, g.exportSave(), g.capital, g.lifetimeBase + g.totalEarned, Object.keys(g.discovered).length);
}

export const useCloud = create<CloudState>()((set, get) => ({
  enabled: cloudEnabled(),
  user: null,
  busy: false,
  error: null,
  lastSyncAt: null,

  init: async () => {
    if (!get().enabled) return;
    try {
      const user = await currentUser();
      set({ user });
    } catch {
      /* sin sesión */
    }
  },

  register: async (username, password) => {
    set({ busy: true, error: null });
    try {
      const user = await signUp(username, password);
      await mergeOnLogin(user);
      set({ user, busy: false, lastSyncAt: Date.now() });
      return true;
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
      return false;
    }
  },

  login: async (username, password) => {
    set({ busy: true, error: null });
    try {
      const user = await signIn(username, password);
      await mergeOnLogin(user);
      set({ user, busy: false, lastSyncAt: Date.now() });
      return true;
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
      return false;
    }
  },

  logout: async () => {
    await get().sync();
    await signOut();
    set({ user: null, lastSyncAt: null });
  },

  sync: async () => {
    const user = get().user;
    if (!user || get().busy) return;
    try {
      const g = useGame.getState();
      await pushSave(user.id, g.exportSave(), g.capital, g.lifetimeBase + g.totalEarned, Object.keys(g.discovered).length);
      set({ lastSyncAt: Date.now(), error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));

// Guardado con retraso tras cambios importantes (como mucho una vez cada 20 s).
let pending = 0;
cloudHooks.onChange = () => {
  if (pending || !useCloud.getState().user) return;
  pending = window.setTimeout(() => {
    pending = 0;
    void useCloud.getState().sync();
  }, 20_000);
};
