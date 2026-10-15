import { es } from "./es";

type Dict = typeof es;

/** Claves hoja del diccionario en forma "seccion.clave". */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type TextKey = Leaves<Dict>;
export type Locale = "es";

const dictionaries: Record<Locale, Dict> = { es };
let current: Locale = "es";

export function setLocale(locale: Locale) {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

/** Devuelve el texto de una clave, sustituyendo {variables}. Si falta la clave, devuelve la clave (nunca rompe la interfaz). */
export function t(key: TextKey, vars?: Record<string, string | number>): string {
  let node: unknown = dictionaries[current];
  for (const part of key.split(".")) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  if (typeof node !== "string") return key;
  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** Lista plana de todas las claves (para pruebas y para comprobar diccionarios futuros). */
export function allKeys(dict: Record<string, unknown> = es, prefix = ""): string[] {
  return Object.entries(dict).flatMap(([k, v]) =>
    typeof v === "string" ? [prefix + k] : allKeys(v as Record<string, unknown>, `${prefix}${k}.`),
  );
}
