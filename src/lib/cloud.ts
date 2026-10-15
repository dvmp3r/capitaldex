import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Nube (Supabase): cuentas con usuario y contraseña, partida guardada y ranking.
 * Si faltan las variables de entorno, el juego funciona igual pero sin estas funciones.
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Los usuarios eligen un nombre; Supabase exige correo, así que se deriva uno interno. */
const EMAIL_DOMAIN = "players.capitaldex.invalid";
export const USERNAME_RE = /^[A-Za-z0-9_]{3,16}$/;
const toEmail = (username: string) => `${username.toLowerCase()}@${EMAIL_DOMAIN}`;

let client: SupabaseClient | null = null;
export function cloudEnabled(): boolean {
  return Boolean(URL && KEY);
}
export function supabase(): SupabaseClient {
  if (!URL || !KEY) throw new Error("Nube no configurada");
  client ??= createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export interface CloudUser {
  id: string;
  username: string;
}

export interface LeaderboardRow {
  username: string;
  capital: number;
  total_earned: number;
  companies: number;
  updated_at: string;
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("duplicate") || m.includes("unique")) return "Ese nombre ya está cogido.";
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "Nombre o contraseña incorrectos.";
  if (m.includes("password") && m.includes("6")) return "La contraseña necesita al menos 6 caracteres.";
  if (m.includes("rate limit")) return "Demasiados intentos, espera un minuto.";
  return message;
}

export async function signUp(username: string, password: string): Promise<CloudUser> {
  if (!USERNAME_RE.test(username)) throw new Error("El nombre: de 3 a 16 letras, números o guion bajo.");
  const { data, error } = await supabase().auth.signUp({ email: toEmail(username), password, options: { data: { username } } });
  if (error) throw new Error(friendly(error.message));
  if (!data.user) throw new Error("No se pudo crear la cuenta.");
  return { id: data.user.id, username };
}

export async function signIn(username: string, password: string): Promise<CloudUser> {
  const { data, error } = await supabase().auth.signInWithPassword({ email: toEmail(username), password });
  if (error) throw new Error(friendly(error.message));
  return { id: data.user.id, username: (data.user.user_metadata?.username as string) ?? username };
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
}

export async function currentUser(): Promise<CloudUser | null> {
  if (!cloudEnabled()) return null;
  const { data } = await supabase().auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, username: (data.user.user_metadata?.username as string) ?? "?" };
}

/** Sube la partida (texto exportado) con sus cifras para el ranking. */
export async function pushSave(userId: string, saveText: string, capital: number, totalEarned: number, companies: number): Promise<void> {
  const { error } = await supabase().from("saves").upsert({ user_id: userId, data: JSON.parse(saveText), capital, total_earned: totalEarned, companies, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/** Descarga la partida guardada en la nube, o null si no hay. */
export async function pullSave(userId: string): Promise<{ saveText: string; updatedAt: string } | null> {
  const { data, error } = await supabase().from("saves").select("data, updated_at").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { saveText: JSON.stringify(data.data), updatedAt: data.updated_at as string };
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase().from("leaderboard").select("*").limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as LeaderboardRow[];
}
