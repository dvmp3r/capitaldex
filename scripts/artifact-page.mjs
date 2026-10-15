// Genera dist/artifact.html: la misma app compilada, sin el esqueleto <html>/<head>/<body>,
// porque el visor de artefactos de Claude añade el suyo. Uso: node scripts/artifact-page.mjs
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? "";
const body = html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? "";

// Del <head> conservamos título, meta de descripción, fuentes y hojas de estilo; fuera charset y viewport.
const keep = [...head.matchAll(/<(title|link|meta|script)[^>]*>(?:[\s\S]*?<\/\1>)?/g)]
  .map((m) => m[0])
  .filter((tag) => !/charset=|name="viewport"/.test(tag));

writeFileSync("dist/artifact.html", `${keep.join("\n")}\n${body.trim()}\n`);
console.log("dist/artifact.html listo");
