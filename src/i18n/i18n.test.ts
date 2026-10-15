import { describe, expect, it } from "vitest";
import { es } from "./es";
import { allKeys, t } from "./index";

describe("diccionario de textos", () => {
  it("todas las claves tienen texto no vacío", () => {
    const keys = allKeys(es);
    expect(keys.length).toBeGreaterThan(80);
    for (const k of keys) expect(t(k as Parameters<typeof t>[0]), k).not.toBe("");
  });

  it("sustituye variables y deja las desconocidas visibles", () => {
    expect(t("gacha.opened", { n: 7 })).toBe("7 abiertas");
    expect(t("sets.title", { name: "IBEX 35", owned: 3, total: 35, mult: "×1,02", bonus: 25 })).toBe("IBEX 35: 3 de 35. Bonus actual ×1,02, máximo +25 %");
    expect(t("gacha.opened")).toBe("{n} abiertas");
  });

  it("una clave inexistente devuelve la propia clave en vez de romper", () => {
    expect(t("no.existe" as never)).toBe("no.existe");
  });
});
