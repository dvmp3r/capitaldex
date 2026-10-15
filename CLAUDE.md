# CLAUDE.md — CapitalDex

Juego incremental de navegador: gacha de empresas cotizadas reales. Responder y documentar **en español**.

## Mapa del proyecto

- `docs/GDD.md` — diseño del juego. Es la referencia de reglas; si el código y el GDD discrepan, se decide y se actualizan los dos.
- `docs/ROADMAP.md` — fases con checklists `[ ]`. Es la cola de trabajo.
- `docs/LEGAL.md` — límites: sin logos de empresas, sin tiradas de pago, aviso de no afiliación siempre visible.
- `src/game/` — reglas puras (sin React). `balance.ts` tiene todas las constantes de equilibrio.
- `src/store/gameStore.ts` — estado del juego (Zustand con persistencia local). Subir `SAVE_VERSION` y escribir una migración si cambia la forma del guardado.
- `src/components/` — interfaz. Tokens de diseño en `src/index.css` (`@theme`).
- `src/components/gacha3d/` — máquina de cápsulas en 3D: `sim.ts` (física y fases, sin three.js, con pruebas) y `GachaMachine3D.tsx` (escena React Three Fiber). `GachaStage.tsx` la dirige por fases. En desarrollo, `window.__gachaSim` permite forzar estados desde la consola.
- `data/empresas.xlsx` → `npm run data` → `src/data/companies.json`. Nunca editar el JSON a mano.

## Comandos

```bash
npm run dev        # servidor local en http://localhost:5173
npm test           # pruebas (Vitest)
npm run build      # tipos + build de producción
npm run data       # regenerar datos desde el Excel
```

## Reglas de trabajo

- Cada cambio de reglas de juego lleva prueba en `src/game/*.test.ts`.
- Antes de dar algo por terminado: `npm test` y `npm run build` en verde, y comprobar la pantalla afectada en el navegador.
- Interfaz: tema oscuro (negro neutro), blanco como marca, dorado solo en el logo; cartas verticales con arte generado por ticker. Sin emojis como iconos (Windows no los dibuja igual), sin logos, sin banderas emoji.
- Commits pequeños con mensaje en español que empiece por la fase (`f1: progreso offline configurable`).

## Protocolo de iteración autónoma

Cuando el autor diga "sigue el roadmap" (o se ejecute en bucle), hacer exactamente esto, una tarea por iteración:

1. Leer `docs/ROADMAP.md` y elegir la **primera tarea `[ ]` de la fase más baja** que no esté bloqueada por una decisión humana (nombre, dominio, cuentas en servicios externos, pagos, legal). Las bloqueadas se saltan y se listan al final.
2. Si la tarea es ambigua, decidir con el GDD y anotar la decisión en el GDD (sección correspondiente o "Preguntas abiertas").
3. Implementar con pruebas. Ejecutar `npm test` y `npm run build`. Si algo falla, arreglarlo antes de seguir.
4. Comprobar en el navegador la pantalla afectada (captura).
5. Marcar la tarea `[x]` en el roadmap con la fecha, y hacer commit.
6. Informar en tres líneas: qué se hizo, qué se decidió, qué sigue. Parar si la siguiente tarea requiere al autor.

No tocar `data/raw/` ni la lista de empresas sin pedirlo. No añadir dependencias pesadas (motores de juego, UI kits) sin consultarlo.
