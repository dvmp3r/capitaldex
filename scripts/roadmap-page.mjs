// Genera docs/roadmap.html a partir de docs/ROADMAP.md para publicarlo como página en Claude.
// Uso: node scripts/roadmap-page.mjs
import { readFileSync, writeFileSync } from "node:fs";

const md = readFileSync("docs/ROADMAP.md", "utf8").split(/\r?\n/);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

let html = "";
let list = false;
let table = [];
const closeList = () => {
  if (list) html += "</ul>";
  list = false;
};
const flushTable = () => {
  if (!table.length) return;
  const rows = table.filter((r) => !/^\|\s*-/.test(r)).map((r) => r.split("|").slice(1, -1).map((c) => inline(c.trim())));
  html += `<table><thead><tr>${rows[0].map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  table = [];
};
let done = 0;
let total = 0;
for (const line of md) {
  if (line.startsWith("|")) {
    closeList();
    table.push(line);
    continue;
  }
  flushTable();
  const h = /^(#{1,3})\s+(.*)$/.exec(line);
  if (h) {
    closeList();
    const level = h[1].length;
    const text = inline(h[2]);
    const m = /Fase (\d)/.exec(h[2]);
    html += level === 1 ? "" : `<h${level}${m ? ` data-phase="${m[1]}"` : ""}>${text}</h${level}>`;
    continue;
  }
  const task = /^- \[( |x)\]\s+(.*)$/.exec(line);
  if (task) {
    if (!list) {
      html += "<ul>";
      list = true;
    }
    const ok = task[1] === "x";
    total++;
    if (ok) done++;
    html += `<li class="${ok ? "done" : "todo"}"><span class="box">${ok ? "✓" : ""}</span><span>${inline(task[2])}</span></li>`;
    continue;
  }
  if (line.trim() === "") {
    closeList();
    continue;
  }
  closeList();
  html += `<p>${inline(line)}</p>`;
}
closeList();
flushTable();

const page = `<title>Roadmap CapitalDex</title>
<style>
:root { --bg:#111; --fg:#f2f2f2; --muted:#a3a3a3; --line:#2b2b2b; --gold:#f5b921; --up:#2ad46f; color-scheme: dark; }
:root[data-theme="light"] { --bg:#fff; --fg:#111; --muted:#5c5c5c; --line:#e3e3e3; --gold:#a8740c; --up:#13813f; color-scheme: light; }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --bg:#fff; --fg:#111; --muted:#5c5c5c; --line:#e3e3e3; --gold:#a8740c; --up:#13813f; color-scheme: light; } }
body { background: var(--bg); color: var(--fg); font: 15px/1.55 ui-sans-serif, system-ui, sans-serif; margin: 0; padding-block: 32px; padding-inline: 16px; }
main { max-width: 760px; margin: 0 auto; }
h1 { font-size: 30px; margin: 0 0 4px; letter-spacing: -0.02em; text-wrap: balance; }
.sub { color: var(--muted); margin: 0 0 24px; }
.progress { height: 8px; border-radius: 999px; background: var(--line); overflow: hidden; margin: 12px 0 28px; }
.progress i { display: block; height: 100%; background: var(--gold); }
h2 { font-size: 20px; margin: 36px 0 8px; padding-top: 16px; border-top: 1px solid var(--line); text-wrap: balance; }
ul { list-style: none; padding: 0; margin: 8px 0; }
li { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; }
.box { flex: 0 0 20px; height: 20px; border-radius: 6px; border: 1.5px solid var(--line); display: grid; place-items: center; font-size: 12px; font-weight: 700; margin-top: 2px; }
.done .box { background: var(--up); border-color: var(--up); color: #fff; }
.done span:last-child { color: var(--muted); }
code { font-family: ui-monospace, monospace; font-size: 0.9em; background: var(--line); padding: 1px 5px; border-radius: 4px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--muted); font-weight: 600; }
p { margin: 8px 0; max-width: 70ch; }
.meta { color: var(--muted); font-size: 13px; }
</style>
<main>
<h1>Roadmap de CapitalDex</h1>
<p class="sub">${done} de ${total} tareas hechas · generado el ${new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })} desde docs/ROADMAP.md</p>
<div class="progress"><i style="width:${Math.round((done / total) * 100)}%"></i></div>
${html}
<p class="meta">Juego: <a href="https://kaminarishop.store">kaminarishop.store</a> · Código: <a href="https://github.com/dvmp3r/capitaldex">github.com/dvmp3r/capitaldex</a></p>
</main>
`;
writeFileSync("docs/roadmap.html", page);
console.log(`docs/roadmap.html listo (${done}/${total})`);
